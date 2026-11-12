import { Router } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { saveAudio } from '../services/storage.js';
import { processRecording } from '../services/recordingProcessor.js';
import {
  transcribeAudio,
  translateToEnglish,
} from '../services/ai.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 24 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (
      /^audio\//i.test(file.mimetype) ||
      file.mimetype === 'application/octet-stream'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an audio recording.'));
    }
  },
});

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'our-stories-api',
    time: new Date().toISOString(),
  });
});

// Development-only authentication helper.
// Production authentication must use verified OTP.
router.post('/dev/session', async (req, res, next) => {
  try {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_DEV_AUTH !== 'true'
    ) {
      return res.status(404).json({ error: 'Not found' });
    }

    const parsed = z
      .object({
        name: z.string().min(1).max(80).default('Storyteller'),
        email: z.string().email().default('demo@ourstories.local'),
        language: z.enum(['en', 'hi', 'gu']).default('en'),
      })
      .safeParse(req.body || {});

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid profile details.',
      });
    }

    const user = await prisma.user.upsert({
      where: {
        email: parsed.data.email,
      },
      update: {
        name: parsed.data.name,
        preferredLanguage: parsed.data.language,
      },
      create: {
        name: parsed.data.name,
        email: parsed.data.email,
        preferredLanguage: parsed.data.language,
        role: 'RECIPIENT',
      },
    });

    const token = jwt.sign(
      { role: user.role },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: '7d',
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get categories.
router.get('/categories', requireAuth, async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// Get questions in the selected language.
router.get('/questions', requireAuth, async (req, res, next) => {
  try {
    const language = ['en', 'hi', 'gu'].includes(req.query.language)
      ? req.query.language
      : 'en';

    const where = {
      isActive: true,
      language,
      ...(req.query.category
        ? { categoryId: String(req.query.category) }
        : {}),
    };

    const questions = await prisma.question.findMany({
      where,
      orderBy: [
        { categoryId: 'asc' },
        { sortOrder: 'asc' },
      ],
      include: {
        category: true,
      },
    });

    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

// Create a story session.
router.post('/sessions', requireAuth, async (req, res, next) => {
  try {
    const data = z
      .object({
        questionId: z.string().optional(),
        language: z.enum(['en', 'hi', 'gu']).default('en'),
      })
      .parse(req.body);

    const session = await prisma.storySession.create({
      data: {
        userId: req.user.id,
        questionId: data.questionId,
        language: data.language,
      },
    });

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

/*
 * STEP 1: UPLOAD RECORDING
 *
 * This endpoint ONLY stores the original audio.
 * It does NOT transcribe, translate or generate follow-up questions.
 */

router.post(
  '/sessions/:sessionId/recordings',
  requireAuth,
  upload.single('audio'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Audio file is required.',
        });
      }

      const session = await prisma.storySession.findFirst({
        where: {
          id: req.params.sessionId,
          userId: req.user.id,
        },
      });

      if (!session) {
        return res.status(404).json({
          error: 'Story session not found.',
        });
      }

      // Save original audio to local storage.
      const stored = await saveAudio(req.file);

      // Create the recording in PostgreSQL.
      const recording = await prisma.recording.create({
        data: {
          sessionId: session.id,
          originalAudioUrl: stored.url,
          originalAudioKey: stored.key,
          mimeType: req.file.mimetype,
          status: 'UPLOADED',
        },
      });

      // Start AI processing without making the user wait.
      void processRecording(recording.id);

      return res.status(201).json({
        message: 'Recording saved. English translation is processing.',
        recording,
      });
    } catch (error) {
      next(error);
    }
  }
);


/*
 * STEP 2: REVIEW RECORDING
 *
 * OpenAI is called only when the user explicitly requests a review.
 * This currently supports local storage. S3 processing needs a storage
 * download/read function before it can be enabled.
 */
router.post(
  '/recordings/:recordingId/review',
  requireAuth,
  async (req, res, next) => {
    let recordingId;

    try {
      const recording = await prisma.recording.findFirst({
        where: {
          id: req.params.recordingId,
          session: {
            userId: req.user.id,
          },
        },
        include: {
          session: true,
        },
      });

      if (!recording) {
        return res.status(404).json({
          error: 'Recording not found.',
        });
      }

      // If already reviewed, return the existing result.
      if (
        recording.originalTranscript &&
        recording.englishTranslation &&
        recording.status !== 'FAILED'
      ) {
        return res.json({
          recording,
          message: 'This recording has already been reviewed.',
        });
      }

      if (process.env.STORAGE_DRIVER === 's3') {
        return res.status(501).json({
          error:
            'Review processing for S3 storage is not configured yet. Local storage is currently required.',
        });
      }

      recordingId = recording.id;

      const uploadDir = path.resolve(
        process.env.UPLOAD_DIR || './uploads'
      );

      const audioPath = path.resolve(
        uploadDir,
        recording.originalAudioKey
      );

      // Prevent a storage key from escaping the upload directory.
      if (
        audioPath !== uploadDir &&
        !audioPath.startsWith(uploadDir + path.sep)
      ) {
        return res.status(400).json({
          error: 'Invalid recording storage path.',
        });
      }

      await fs.access(audioPath);

      await prisma.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          status: 'TRANSCRIBING',
          processingError: null,
        },
      });

      const language = recording.session.language;

      // Transcribe in the original language.
      const transcript = await transcribeAudio(
        audioPath,
        language
      );

      if (!transcript || !transcript.trim()) {
        throw new Error(
          'No speech was detected. Please try reviewing this recording again.'
        );
      }

      await prisma.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          originalTranscript: transcript.trim(),
          detectedLanguage: language,
          status: 'TRANSLATING',
        },
      });

      // English recordings do not need another translation call.
      const translation =
        language === 'en'
          ? transcript.trim()
          : await translateToEnglish(transcript, language);

      if (!translation || !translation.trim()) {
        throw new Error(
          'The English translation could not be generated. Please try again.'
        );
      }

      const updatedRecording = await prisma.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          englishTranslation: translation.trim(),
          status: 'REVIEW_PENDING',
          processingError: null,
        },
      });

      return res.json({
        message: 'Your recording has been reviewed successfully.',
        recording: updatedRecording,
      });
    } catch (error) {
      if (recordingId) {
        await prisma.recording
          .update({
            where: {
              id: recordingId,
            },
            data: {
              status: 'FAILED',
              processingError:
                error instanceof Error
                  ? error.message
                  : 'Review processing failed.',
            },
          })
          .catch(() => { });
      }

      next(error);
    }
  }
);

/*
 * STEP 3: SAVE REVIEWED MEMORY
 *
 * The transcript and translation come from the database,
 * not from unverified values sent by the mobile app.
 */
router.post(
  '/recordings/:recordingId/save',
  requireAuth,
  async (req, res, next) => {
    try {
      const data = z
        .object({
          title: z.string().min(1).max(120),
          visibility: z
            .enum(['PRIVATE', 'FAMILY'])
            .default('PRIVATE'),
        })
        .parse(req.body);

      const recording = await prisma.recording.findFirst({
        where: {
          id: req.params.recordingId,
          session: {
            userId: req.user.id,
          },
        },
      });

      if (!recording) {
        return res.status(404).json({
          error: 'Recording not found.',
        });
      }

      if (
        !recording.originalTranscript ||
        !recording.englishTranslation ||
        !['REVIEW_PENDING', 'SAVED'].includes(recording.status)
      ) {
        return res.status(400).json({
          error: 'Please review this recording before saving it as a memory.',
        });
      }

      const memory = await prisma.memory.upsert({
        where: {
          recordingId: recording.id,
        },
        update: {
          title: data.title,
          transcript: recording.originalTranscript,
          translation: recording.englishTranslation,
          visibility: data.visibility,
        },
        create: {
          userId: req.user.id,
          recordingId: recording.id,
          title: data.title,
          transcript: recording.originalTranscript,
          translation: recording.englishTranslation,
          visibility: data.visibility,
        },
      });

      await prisma.recording.update({
        where: {
          id: recording.id,
        },
        data: {
          status: 'SAVED',
        },
      });

      return res.status(201).json({ memory });
    } catch (error) {
      next(error);
    }
  }
);

// Get all recordings belonging to the logged-in user,
// including recordings that have not yet been reviewed.
router.get('/recordings', requireAuth, async (req, res, next) => {
  try {
    const recordings = await prisma.recording.findMany({
      where: {
        session: {
          userId: req.user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        session: {
          include: {
            question: true,
          },
        },
        memory: true,
      },
    });

    res.json({ recordings });
  } catch (error) {
    next(error);
  }
});

// Securely stream an original recording belonging to the logged-in user.
router.get('/recordings/:recordingId/audio', requireAuth, async (req, res, next) => {
  try {
    const recording = await prisma.recording.findFirst({
      where: {
        id: req.params.recordingId,
        session: {
          userId: req.user.id,
        },
      },
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    if (process.env.STORAGE_DRIVER === 's3') {
      return res.status(501).json({
        error: 'S3 audio playback is not configured yet.',
      });
    }

    const uploadDir = path.resolve(
      process.env.UPLOAD_DIR || './uploads'
    );

    const audioPath = path.resolve(
      uploadDir,
      recording.originalAudioKey
    );

    // Ensure the storage key cannot escape the uploads directory.
    if (
      audioPath === uploadDir ||
      !audioPath.startsWith(uploadDir + path.sep)
    ) {
      return res.status(400).json({
        error: 'Invalid recording storage path.',
      });
    }

    const audioBuffer = await fs.readFile(audioPath);

    res.setHeader(
      'Content-Type',
      recording.mimeType || 'audio/mp4'
    );
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');

    return res.send(audioBuffer);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Audio file not found.',
      });
    }

    next(error);
  }
});


// Get saved memories.
router.get('/memories', requireAuth, async (req, res, next) => {
  try {
    const memories = await prisma.memory.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        recording: true,
      },
    });

    res.json({ memories });
  } catch (error) {
    next(error);
  }
});

export default router;
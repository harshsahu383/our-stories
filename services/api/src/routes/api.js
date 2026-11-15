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
    console.error('CREATE STORY SESSION ERROR:', error);
    next(error);
  }
});

// Create a StoryPrompt inside an existing story session.
router.post(
  '/sessions/:sessionId/prompts',
  requireAuth,
  async (req, res, next) => {
    try {
      const data = z
        .object({
          questionId: z.string().min(1),
        })
        .parse(req.body);

      // Verify that this session belongs to the logged-in user.
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

      // Find the question in the session's selected language.
      const question = await prisma.question.findFirst({
        where: {
          id: data.questionId,
          language: session.language,
          isActive: true,
        },
      });

      if (!question) {
        return res.status(404).json({
          error: 'Question not found for this session language.',
        });
      }

      // Avoid creating the same prompt twice in one session.
      const existingPrompt = await prisma.storyPrompt.findUnique({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId: question.id,
          },
        },
        include: {
          question: true,
        },
      });

      if (existingPrompt) {
        return res.status(200).json({
          storyPrompt: existingPrompt,
        });
      }

      const lastPrompt = await prisma.storyPrompt.findFirst({
        where: {
          sessionId: session.id,
        },
        orderBy: {
          sortOrder: 'desc',
        },
      });

      const storyPrompt = await prisma.storyPrompt.create({
        data: {
          sessionId: session.id,
          questionId: question.id,
          permanentFollowUpText: question.permanentFollowUpText,
          sortOrder: (lastPrompt?.sortOrder ?? -1) + 1,
        },
        include: {
          question: true,
        },
      });

      return res.status(201).json({
        storyPrompt,
      });
    } catch (error) {
      console.error('CREATE STORY PROMPT ERROR:', error);
      next(error);
    }
  }
);




/**
 * Get all StoryPrompts in a session.
 */
router.get('/sessions/:sessionId/prompts', requireAuth, async (req, res, next) => {
  try {
    const session = await prisma.storySession.findFirst({
      where: {
        id: req.params.sessionId,
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Story session not found.' });
    }

    const prompts = await prisma.storyPrompt.findMany({
      where: {
        sessionId: session.id
      },
      orderBy: {
        sortOrder: 'asc'
      },
      include: {
        question: true,
        recordings: {
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            id: true,
            answerType: true,
            status: true,
            englishTranslation: true,
            processingError: true,
            createdAt: true
          }
        }
      }
    });

    return res.json({ prompts });
  } catch (error) {
    next(error);
  }
});

/**
 * Get one StoryPrompt, including its AI follow-up.
 * The mobile app can poll this endpoint while AI generation is running.
 */
router.get(
  '/sessions/:sessionId/prompts/:promptId',
  requireAuth,
  async (req, res, next) => {
    try {
      const storyPrompt = await prisma.storyPrompt.findFirst({
        where: {
          id: req.params.promptId,
          sessionId: req.params.sessionId,
          session: {
            userId: req.user.id
          }
        },
        include: {
          question: true,
          recordings: {
            orderBy: {
              createdAt: 'asc'
            },
            select: {
              id: true,
              answerType: true,
              status: true,
              englishTranslation: true,
              processingError: true,
              createdAt: true
            }
          }
        }
      });

      if (!storyPrompt) {
        return res.status(404).json({
          error: 'Story prompt not found.'
        });
      }

      return res.json({ storyPrompt });
    } catch (error) {
      next(error);
    }
  }
);


/*
 * STEP 1: UPLOAD RECORDING
 *
 * This endpoint ONLY stores the original audio.
 * It does NOT transcribe, translate or generate follow-up questions.
 */


/**
 * Upload one answer recording.
 *
 * Required multipart fields:
 * - audio
 * - storyPromptId
 * - answerType: MAIN | PERMANENT_FOLLOW_UP | AI_FOLLOW_UP
 */
router.post(
  '/sessions/:sessionId/recordings',
  requireAuth,
  upload.single('audio'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Audio file is required.'
        });
      }

      const data = z.object({
        storyPromptId: z.string().min(1),
        answerType: z.enum([
          'MAIN',
          'PERMANENT_FOLLOW_UP',
          'AI_FOLLOW_UP'
        ])
      }).safeParse(req.body);

      if (!data.success) {
        return res.status(400).json({
          error: 'A valid storyPromptId and answerType are required.'
        });
      }

      const session = await prisma.storySession.findFirst({
        where: {
          id: req.params.sessionId,
          userId: req.user.id
        }
      });

      if (!session) {
        return res.status(404).json({
          error: 'Story session not found.'
        });
      }

      const storyPrompt = await prisma.storyPrompt.findFirst({
        where: {
          id: data.data.storyPromptId,
          sessionId: session.id
        }
      });

      if (!storyPrompt) {
        return res.status(404).json({
          error: 'Story prompt not found in this session.'
        });
      }

      // The third answer can only be uploaded after AI generates it.
      if (
        data.data.answerType === 'AI_FOLLOW_UP' &&
        (
          storyPrompt.aiFollowUpStatus !== 'READY' ||
          !storyPrompt.aiFollowUpText
        )
      ) {
        return res.status(409).json({
          error: 'The AI follow-up question is not ready yet.'
        });
      }

      // Do not allow multiple recordings for the same answer step.
      const existingRecording = await prisma.recording.findFirst({
        where: {
          storyPromptId: storyPrompt.id,
          answerType: data.data.answerType
        }
      });

      if (existingRecording) {
        return res.status(409).json({
          error: 'A recording already exists for this answer step.',
          recording: existingRecording
        });
      }

      const stored = await saveAudio(req.file);

      const recording = await prisma.recording.create({
        data: {
          sessionId: session.id,
          storyPromptId: storyPrompt.id,
          answerType: data.data.answerType,
          originalAudioUrl: stored.url,
          originalAudioKey: stored.key,
          mimeType: req.file.mimetype,
          status: 'UPLOADED'
        }
      });

      // Process the recording asynchronously.
      void processRecording(recording.id);

      return res.status(201).json({
        message: 'Recording uploaded. English translation is processing.',
        recording
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


/*
 * STEP 3: SAVE REVIEWED MEMORY
 *
 * The transcript and translation come from the database,
 * not from unverified values sent by the mobile app.
 */


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
            question: true
          }
        },
        storyPrompt: {
          include: {
            question: true
          }
        },
        memory: true
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
        userId: req.user.id
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        recording: {
          include: {
            storyPrompt: {
              include: {
                question: true
              }
            }
          }
        }
      }
    });

    return res.json({ memories });
  } catch (error) {
    next(error);
  }
});


export default router;
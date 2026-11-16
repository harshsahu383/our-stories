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
  randomBytes,
  randomInt,
  createHmac,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { sendEmail } from '../services/email.js';



const router = Router();
const scrypt = promisify(scryptCallback);

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function hashOtp(code, purpose, userId) {
  const secret = process.env.OTP_SECRET;

  if (!secret) {
    throw new Error('OTP_SECRET is not configured.');
  }

  return createHmac('sha256', secret)
    .update(`${userId}:${purpose}:${code}`)
    .digest('hex');
}

function safeHashCompare(a, b) {
  const first = Buffer.from(a, 'hex');
  const second = Buffer.from(b, 'hex');

  return (
    first.length === second.length &&
    timingSafeEqual(first, second)
  );
}

async function issueEmailOtp(user, purpose) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const cooldownAgo = new Date(
    now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000
  );

  const recentOtps = await prisma.emailOtp.findMany({
    where: {
      userId: user.id,
      purpose,
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (recentOtps.length >= OTP_MAX_SENDS_PER_HOUR) {
    throw new Error('OTP hourly limit reached. Please try again later.');
  }

  if (
    recentOtps.length > 0 &&
    recentOtps[0].createdAt > cooldownAgo
  ) {
    throw new Error('Please wait before requesting another OTP.');
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = hashOtp(code, purpose, user.id);
  const expiresAt = new Date(
    now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000
  );

  const otp = await prisma.$transaction(async (tx) => {
    await tx.emailOtp.updateMany({
      where: {
        userId: user.id,
        purpose,
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    return tx.emailOtp.create({
      data: {
        userId: user.id,
        purpose,
        codeHash,
        expiresAt,
      },
    });
  });

  try {
    await sendEmail({
      to: user.email,
      subject:
        purpose === 'SIGNUP'
          ? 'Verify your Our Stories account'
          : purpose === 'GIFT_ACTIVATION'
            ? 'Activate your Our Stories gift'
            : 'Reset your Our Stories password',

      text:
        purpose === 'SIGNUP'
          ? `Your Our Stories verification code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`
          : purpose === 'GIFT_ACTIVATION'
            ? `Your Our Stories gift activation code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`
            : `Your Our Stories password reset code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#222">
          <h2>Our Stories</h2>
          <p>
           ${
        purpose === 'SIGNUP'
          ? 'Use this code to verify your email address.'
          : purpose === 'GIFT_ACTIVATION'
            ? 'Use this code to activate your Our Stories gift.'
            : 'Use this code to reset your password.'
}
          </p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0">
            ${code}
          </div>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    throw error;
  }

  return otp;
}

async function checkEmailOtp(user, purpose, code) {
  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId: user.id,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || otp.expiresAt <= new Date()) {
    return { valid: false, reason: 'expired' };
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { valid: false, reason: 'attempts' };
  }

  const suppliedHash = hashOtp(code, purpose, user.id);

  if (!safeHashCompare(suppliedHash, otp.codeHash)) {
    const nextAttempts = otp.attempts + 1;

    await prisma.emailOtp.updateMany({
      where: {
        id: otp.id,
        consumedAt: null,
        attempts: otp.attempts,
      },
      data: {
        attempts: { increment: 1 },
        ...(nextAttempts >= OTP_MAX_ATTEMPTS
          ? { consumedAt: new Date() }
          : {}),
      },
    });

    return { valid: false, reason: 'incorrect' };
  }

  return { valid: true, otp };
}


async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');

  const derivedKey = await scrypt(password, salt, 64);

  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const storedKey = Buffer.from(hash, 'hex');
  const suppliedKey = await scrypt(password, salt, 64);

  return (
    storedKey.length === suppliedKey.length &&
    timingSafeEqual(storedKey, suppliedKey)
  );
}

function createAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.sign(
    {
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: '7d',
    }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
  };
}

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


// Purchaser signup
router.post('/auth/signup', async (req, res, next) => {
  try {
    const parsed = z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().email().max(254),
      phone: z.string().trim().min(7).max(20),
      password: z.string().min(8).max(128),
      language: z.enum(['en', 'hi', 'gu']).default('en'),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please provide valid signup details.',
      });
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: existingUser.emailVerifiedAt
          ? 'An account with this email already exists. Please sign in.'
          : 'Signup is already pending for this email. Please request a new verification code.',
      });
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone: data.phone,
        passwordHash,
        role: 'PURCHASER',
        preferredLanguage: data.language,
      },
    });

    try {
      await issueEmailOtp(user, 'SIGNUP');
    } catch (emailError) {
      console.error('[signup-email-error]', emailError);
      return res.status(503).json({
        message: 'Your account was created, but the verification email could not be sent. Please try resending the code.',
        emailVerificationRequired: true,
        email,
      });
    }

    return res.status(202).json({
      message: 'Verification code sent to your email.',
      emailVerificationRequired: true,
      email,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'An account with this email already exists.',
      });
    }

    next(error);
  }
});


// Purchaser login
router.post('/auth/login', async (req, res, next) => {
  try {
    const parsed = z.object({
      email: z.string().trim().email().max(254),
      password: z.string().min(1).max(128),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please enter a valid email and password.',
      });
    }

    const email = parsed.data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      !['PURCHASER', 'RECIPIENT'].includes(user.role) ||
      !user.passwordHash
    ) {
      return res.status(401).json({
        error: 'Incorrect email or password.',
      });
    }

    const passwordMatches = await verifyPassword(
      parsed.data.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Incorrect email or password.',
      });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        emailVerificationRequired: true,
        email: user.email,
      });
    }

    const token = createAuthToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/verify-email', async (req, res, next) => {
  try {
    const parsed = z.object({
      email: z.string().trim().email().max(254),
      code: z.string().regex(/^\d{6}$/),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Enter a valid email and six-digit verification code.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (
      !user ||
      user.role !== 'PURCHASER' ||
      user.emailVerifiedAt
    ) {
      return res.status(400).json({
        error: 'Invalid or expired verification code.',
      });
    }

    const result = await checkEmailOtp(
      user,
      'SIGNUP',
      parsed.data.code
    );

    if (!result.valid) {
      return res.status(400).json({
        error: 'Invalid or expired verification code.',
      });
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailOtp.updateMany({
        where: {
          id: result.otp.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: { consumedAt: new Date() },
      });

      if (consumed.count !== 1) {
        return null;
      }

      return tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    });

    if (!verifiedUser) {
      return res.status(400).json({
        error: 'Invalid or expired verification code.',
      });
    }

    const token = createAuthToken(verifiedUser);

    return res.json({
      message: 'Email verified successfully.',
      token,
      user: publicUser(verifiedUser),
    });
  } catch (error) {
    next(error);
  }
});


// Resend signup verification code.
router.post('/auth/resend-verification', async (req, res, next) => {
  try {
    const parsed = z.object({
      email: z.string().trim().email().max(254),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Enter a valid email address.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (
      user &&
      user.role === 'PURCHASER' &&
      !user.emailVerifiedAt
    ) {
      try {
        await issueEmailOtp(user, 'SIGNUP');
      } catch (error) {
        console.warn('[resend-verification]', error.message);
      }
    }

    return res.json({
      message: 'If your account needs verification, a code will be sent when eligible.',
    });
  } catch (error) {
    next(error);
  }
});
// Restore the currently authenticated user
router.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Account not found.',
      });
    }

    return res.json({
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
});


// Create a pending gift for the authenticated purchaser.
router.post('/gifts', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'PURCHASER') {
      return res.status(403).json({
        error: 'Only purchasers can create gifts.',
      });
    }

    const parsed = z.object({
      recipientName: z.string().trim().min(2).max(80),
      recipientEmail: z.string().trim().email().max(254),
      recipientPhone: z.string().trim().min(7).max(20).optional(),
      personalNote: z.string().trim().max(500).optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please provide valid recipient details.',
      });
    }

    const recipientEmail = parsed.data.recipientEmail.toLowerCase();

    // An already reserved email cannot receive another gift.
    const existingGift = await prisma.gift.findUnique({
      where: {
        recipientEmailReserved: recipientEmail,
      },
      select: { id: true },
    });

    if (existingGift) {
      return res.status(409).json({
        error: 'This recipient email has already been used for a gift.',
      });
    }

    const gift = await prisma.gift.create({
      data: {
        code: randomBytes(24).toString('hex'),
        purchaserId: req.user.id,
        recipientName: parsed.data.recipientName,
        recipientEmail,
        recipientPhone: parsed.data.recipientPhone,
        personalNote: parsed.data.personalNote,
        status: 'PENDING_PAYMENT',
      },
      select: {
        id: true,
        recipientName: true,
        recipientEmail: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: 'Gift created. Payment is pending.',
      gift,
    });
  } catch (error) {
    next(error);
  }
});


// DEVELOPMENT ONLY: Simulate payment outcomes.
// This endpoint must never be enabled in production.
router.post(
  '/gifts/:giftId/mock-payment',
  requireAuth,
  async (req, res, next) => {
    try {
      if (
        process.env.NODE_ENV === 'production' ||
        process.env.ENABLE_MOCK_PAYMENTS !== 'true'
      ) {
        return res.status(404).json({ error: 'Not found.' });
      }

      if (req.user.role !== 'PURCHASER') {
        return res.status(403).json({
          error: 'Only purchasers can make gift payments.',
        });
      }

      const parsed = z.object({
        outcome: z.enum(['SUCCESS', 'FAILED', 'PENDING']),
      }).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: 'Choose SUCCESS, FAILED or PENDING.',
        });
      }

      const gift = await prisma.gift.findFirst({
        where: {
          id: req.params.giftId,
          purchaserId: req.user.id,
        },
      });

      if (!gift) {
        return res.status(404).json({
          error: 'Gift not found.',
        });
      }

      if (
        gift.status === 'PAID' ||
        gift.status === 'ACTIVATED' ||
        gift.status === 'CANCELLED' ||
        gift.status === 'REFUNDED'
      ) {
        return res.status(409).json({
          error: 'This gift cannot be paid in its current state.',
        });
      }

      const outcome = parsed.data.outcome;

      if (outcome === 'PENDING') {
        return res.json({
          message: 'Mock payment is pending.',
          gift: {
            id: gift.id,
            status: gift.status,
          },
        });
      }

      if (outcome === 'FAILED') {
        const updated = await prisma.gift.update({
          where: { id: gift.id },
          data: { status: 'PAYMENT_FAILED' },
          select: {
            id: true,
            status: true,
          },
        });

        return res.json({
          message: 'Mock payment failed.',
          gift: updated,
        });
      }

      // Reserve the email only after simulated payment success.
      const updatedGift = await prisma.$transaction(async (tx) => {
        const updated = await tx.gift.updateMany({
          where: {
            id: gift.id,
            purchaserId: req.user.id,
            status: {
              in: ['PENDING_PAYMENT', 'PAYMENT_FAILED'],
            },
          },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            recipientEmailReserved: gift.recipientEmail.toLowerCase(),
          },
        });

        if (updated.count !== 1) {
          throw new Error('GIFT_STATE_CHANGED');
        }

        return tx.gift.findUnique({
          where: { id: gift.id },
          select: {
            id: true,
            code: true,
            recipientName: true,
            recipientEmail: true,
            status: true,
            paidAt: true,
          },
        });
      });

      return res.json({
        message: 'Mock payment successful. Recipient email reserved.',
        gift: updatedGift,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'This recipient email has already been reserved by another gift.',
        });
      }

      if (error.message === 'GIFT_STATE_CHANGED') {
        return res.status(409).json({
          error: 'Gift status changed. Please refresh and try again.',
        });
      }

      next(error);
    }
  }
);



// Request a password-reset OTP.
// Always return the same response to avoid revealing registered emails.
router.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const parsed = z.object({
      email: z.string().trim().email().max(254),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Enter a valid email address.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (
      user &&
      user.role === 'PURCHASER' &&
      user.passwordHash &&
      user.emailVerifiedAt
    ) {
      try {
        await issueEmailOtp(user, 'PASSWORD_RESET');
      } catch (error) {
        console.warn('[forgot-password]', error.message);
      }
    }

    return res.json({
      message: 'If an eligible account exists, a password-reset code will be sent.',
    });
  } catch (error) {
    next(error);
  }
});


// Request recipient gift activation OTP.
router.post('/gifts/activation/request', async (req, res, next) => {
  try {
    const parsed = z.object({
      code: z.string().min(1).max(200),
      email: z.string().trim().email().max(254),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please provide a valid gift code and email.',
      });
    }

    const email = parsed.data.email.toLowerCase();

    const gift = await prisma.gift.findFirst({
      where: {
        code: parsed.data.code,
        recipientEmailReserved: email,
        status: 'PAID',
        recipientId: null,
      },
    });

    if (!gift) {
      return res.status(400).json({
        error: 'Gift could not be verified. Check your gift code and email.',
      });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.role !== 'RECIPIENT') {
      return res.status(409).json({
        error: 'This email cannot be used for recipient activation.',
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: gift.recipientName || 'Our Stories Recipient',
          email,
          role: 'RECIPIENT',
          preferredLanguage: 'en',
        },
      });
    }

    await issueEmailOtp(user, 'GIFT_ACTIVATION');

    return res.status(202).json({
      message: 'Gift activation verification code sent to your email.',
      email,
    });
  } catch (error) {
    next(error);
  }
});


// Verify OTP, create recipient credentials if needed,
// and activate the gift atomically.
router.post('/gifts/activation/verify', async (req, res, next) => {
  try {
    const parsed = z.object({
      code: z.string().min(1).max(200),
      email: z.string().trim().email().max(254),
      otp: z.string().regex(/^\d{6}$/),
      password: z.string().min(8).max(128).optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Please provide valid activation details.',
      });
    }

    const email = parsed.data.email.toLowerCase();

    const gift = await prisma.gift.findFirst({
      where: {
        code: parsed.data.code,
        recipientEmailReserved: email,
        status: 'PAID',
        recipientId: null,
      },
    });

    if (!gift) {
      return res.status(400).json({
        error: 'Invalid or expired gift activation request.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== 'RECIPIENT') {
      return res.status(400).json({
        error: 'Invalid or expired gift activation request.',
      });
    }

    const result = await checkEmailOtp(
      user,
      'GIFT_ACTIVATION',
      parsed.data.otp
    );

    if (!result.valid) {
      return res.status(400).json({
        error: 'Invalid or expired verification code.',
      });
    }

    // Existing recipient accounts keep their existing passwords.
    // New recipient accounts must create a password now.
    if (!user.passwordHash && !parsed.data.password) {
      return res.status(400).json({
        error: 'Please create a password for your account.',
        passwordRequired: true,
      });
    }

    const passwordHash = user.passwordHash
      ? undefined
      : await hashPassword(parsed.data.password);

    const activatedUser = await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailOtp.updateMany({
        where: {
          id: result.otp.id,
          userId: user.id,
          purpose: 'GIFT_ACTIVATION',
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      if (consumed.count !== 1) {
        throw new Error('OTP_ALREADY_USED');
      }

      const updatedGift = await tx.gift.updateMany({
        where: {
          id: gift.id,
          status: 'PAID',
          recipientId: null,
          recipientEmailReserved: email,
        },
        data: {
          recipientId: user.id,
          status: 'ACTIVATED',
          activatedAt: new Date(),
        },
      });

      if (updatedGift.count !== 1) {
        throw new Error('GIFT_ALREADY_ACTIVATED');
      }

      return tx.user.update({
        where: { id: user.id },
        data: {
          ...(passwordHash ? { passwordHash } : {}),
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
      });
    });

    const token = createAuthToken(activatedUser);

    return res.json({
      message: 'Gift activated successfully.',
      token,
      user: publicUser(activatedUser),
    });
  } catch (error) {
    if (
      error.message === 'OTP_ALREADY_USED' ||
      error.message === 'GIFT_ALREADY_ACTIVATED'
    ) {
      return res.status(409).json({
        error: 'This activation request has already been completed. Please request a new activation if needed.',
      });
    }

    next(error);
  }
});

// Reset password using the email OTP.
router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const parsed = z.object({
      email: z.string().trim().email().max(254),
      code: z.string().regex(/^\d{6}$/),
      newPassword: z.string().min(8).max(128),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Enter a valid email, six-digit code, and password of at least 8 characters.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (
      !user ||
      user.role !== 'PURCHASER' ||
      !user.emailVerifiedAt
    ) {
      return res.status(400).json({
        error: 'Invalid or expired password-reset code.',
      });
    }

    const result = await checkEmailOtp(
      user,
      'PASSWORD_RESET',
      parsed.data.code
    );

    if (!result.valid) {
      return res.status(400).json({
        error: 'Invalid or expired password-reset code.',
      });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    const updated = await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailOtp.updateMany({
        where: {
          id: result.otp.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: { consumedAt: new Date() },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      return true;
    });

    if (!updated) {
      return res.status(400).json({
        error: 'Invalid or expired password-reset code.',
      });
    }

    return res.json({
      message: 'Password reset successfully. Please sign in with your new password.',
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
    // Only recipient accounts can create story sessions
    if (req.user.role !== 'RECIPIENT') {
      return res.status(403).json({
        error: 'Only recipients can create story sessions.',
      });
    }

    const parsed = z
      .object({
        questionId: z.string().optional(),
        language: z.enum(['en', 'hi', 'gu']).default('en'),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid story session details.',
      });
    }

    // Find this recipient's activated gift
    const gift = await prisma.gift.findFirst({
      where: {
        recipientId: req.user.id,
        status: 'ACTIVATED',
      },
      select: {
        id: true,
      },
    });

    if (!gift) {
      return res.status(403).json({
        error: 'Please activate your gift before starting a story.',
      });
    }

    // Link the session to the gift
    const session = await prisma.storySession.create({
      data: {
        userId: req.user.id,
        giftId: gift.id,
        questionId: parsed.data.questionId,
        language: parsed.data.language,
      },
    });

    return res.status(201).json({ session });
  } catch (error) {
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
    let recordingWhere;

    if (req.user.role === 'RECIPIENT') {
      // Recipients can access their own recordings.
      recordingWhere = {
        session: {
          userId: req.user.id,
        },
      };
    } else if (req.user.role === 'PURCHASER') {
      // Purchasers can access recordings belonging
      // only to gifts they personally purchased.
      recordingWhere = {
        session: {
          gift: {
            is: {
              purchaserId: req.user.id,
            },
          },
        },
      };
    } else {
      return res.status(403).json({
        error: 'You are not allowed to access recordings.',
      });
    }

    const recordings = await prisma.recording.findMany({
      where: recordingWhere,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        session: {
          include: {
            question: true,
            gift: {
              select: {
                id: true,
                recipientName: true,
              },
            },
          },
        },
        storyPrompt: {
          include: {
            question: true,
          },
        },
        memory: true,
      },
    });

    return res.json({ recordings });
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
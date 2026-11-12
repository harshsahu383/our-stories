# Our Stories API (MVP)

Node.js + Express + PostgreSQL + Prisma + OpenAI.

## Setup
1. Create a PostgreSQL database named `our_stories`.
2. Copy `.env.example` to `.env`; configure `DATABASE_URL`, `JWT_SECRET` (32+ random characters), and `OPENAI_API_KEY`.
3. For local development set `STORAGE_DRIVER=local` and `ENABLE_DEV_AUTH=true`.
4. Run `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init`, `npm run prisma:seed`, then `npm run dev`.

Health: `GET http://localhost:4000/api/health`.

## MVP endpoints
- `POST /api/dev/session` (development only): create/reuse demo user and return JWT.
- `GET /api/questions?language=en&category=childhood`
- `GET /api/categories`
- `POST /api/sessions` `{ "questionId": "...", "language": "en" }`
- `POST /api/sessions/:sessionId/recordings` multipart field `audio`; stores audio, transcribes, translates and proposes a follow-up.
- `POST /api/recordings/:recordingId/save` `{ "title": "...", "transcript": "...", "translation": "...", "visibility": "PRIVATE" }`
- `GET /api/memories`

All routes except health and development bootstrap require `Authorization: Bearer <token>`.

## Storage
Local disk is development-only. For production use `STORAGE_DRIVER=s3` and configure S3-compatible credentials. Cloudflare R2 is supported through its S3 endpoint. Keep the bucket private; authenticated signed playback URLs are required before family sharing.

## Production blockers
The development bootstrap is disabled in production. Before release, implement verified email OTP authentication, gift-code activation, private signed audio playback, deletion/export workflows, backups, retention policy, consent screens and HTTPS. Never ship the OpenAI key in the mobile app.

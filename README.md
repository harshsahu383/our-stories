# Our Stories — MVP workspace

This workspace contains the existing Expo mobile app and a new Express/PostgreSQL/OpenAI API scaffold.

## 1) Start the API

```bash
cd services/api
cp .env.example .env
# Fill DATABASE_URL, JWT_SECRET and OPENAI_API_KEY; set ENABLE_DEV_AUTH=true for local-only testing.
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## 2) Connect the mobile app

Create `apps/mobile/.env` from `.env.example` and set `EXPO_PUBLIC_API_URL` to your API host. For a physical phone, use your computer's LAN IP (not localhost). Restart Expo after changing the env file.

```bash
cd apps/mobile
npm install
npx expo start
```

## 3) Current MVP flow

Dashboard -> select language/category -> create story session -> record locally -> upload audio -> OpenAI transcription -> English translation -> AI follow-up suggestion -> review -> save private memory.

## Important release limitations

This is an implementation foundation, not a production-ready release. Development bootstrap auth is intentionally disabled in production. Email OTP and gift-code activation are not wired yet. Configure private S3-compatible storage before production, then add authenticated signed audio playback, consent, deletion/export, backup/retention controls, HTTPS, monitoring, and end-to-end device tests. Never place the OpenAI secret key in the mobile app.

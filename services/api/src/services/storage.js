import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const driver = process.env.STORAGE_DRIVER || 'local';
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
let s3;
if (driver === 's3') {
  s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
  });
}

export async function saveAudio(file) {
  const ext = path.extname(file.originalname || '') || '.m4a';
  const key = `recordings/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
  if (driver === 's3') {
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype }));
    const base = process.env.S3_PUBLIC_BASE_URL;
    return { key, url: base ? `${base.replace(/\/$/, '')}/${key}` : `s3://${process.env.S3_BUCKET}/${key}` };
  }
  await fs.mkdir(path.join(uploadDir, path.dirname(key)), { recursive: true });
  await fs.writeFile(path.join(uploadDir, key), file.buffer, { mode: 0o600 });
  return { key, url: `/uploads/${key}` };
}

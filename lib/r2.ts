/**
 * BLACK LINE PRO — Cloudflare R2 Storage
 * Replaces Supabase Storage.
 *
 * File structure: {userId}/{projectId}/{type}.png
 * Anonymous users:  anon/{anonymousId}/{projectId}/{type}.png
 * Paid users:       users/{clerkUserId}/{projectId}/{type}.png
 *
 * Each user can ONLY access files under their own prefix (enforced server-side).
 * Presigned URLs expire after 1 hour — no permanent public access.
 *
 * Env vars needed:
 *   R2_ACCOUNT_ID        — Cloudflare Account ID
 *   R2_ACCESS_KEY_ID     — R2 API token Access Key
 *   R2_SECRET_ACCESS_KEY — R2 API token Secret Key
 *   R2_BUCKET_NAME       — Bucket name (e.g. "blacklinepro-images")
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET     = process.env.R2_BUCKET_NAME ?? 'blacklinepro-images';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  // R2 doesn't support AWS checksum headers — disable them
  requestChecksumCalculation: 'WHEN_REQUIRED' as any,
  responseChecksumValidation: 'WHEN_REQUIRED' as any,
});

// ─────────────────────────────────────────────────────────────────────────────
// Key helpers — enforce user isolation via prefix
// ─────────────────────────────────────────────────────────────────────────────

export function userPrefix(clerkUserId: string): string {
  return `users/${clerkUserId}`;
}

export function anonPrefix(anonymousId: string): string {
  return `anon/${anonymousId}`;
}

export function buildKey(
  prefix: string,
  projectId: string,
  type: 'original' | 'stencil' | 'thumbnail',
  ext: 'png' | 'webp' = 'png'
): string {
  return `${prefix}/${projectId}/${type}.${ext}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadResult {
  key: string;          // Permanent R2 object key
  presignedUrl: string; // Temporary signed URL to view (1h TTL)
}

export interface UploadWithThumbResult extends UploadResult {
  thumbnailKey: string;
  thumbnailPresignedUrl: string;
}

export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
}

const THUMBNAIL_SIZE = 300;
const URL_TTL        = 3600; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────
// Presigned URL (read)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a short-lived presigned URL for reading a private object.
 * Use this every time you display an image — URLs expire after 1 hour.
 */
export async function getPresignedUrl(
  key: string,
  ttlSeconds = URL_TTL
): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: ttlSeconds }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload helpers
// ─────────────────────────────────────────────────────────────────────────────

function base64ToBuffer(base64: string): Buffer {
  const clean = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

/**
 * Upload a base64 image to R2.
 * Returns the permanent key + a presigned URL to view it immediately.
 */
export async function uploadImage(
  base64Image: string,
  prefix: string,        // userPrefix(clerkId) or anonPrefix(anonId)
  projectId: string,
  type: 'original' | 'stencil'
): Promise<UploadResult> {
  const buffer = base64ToBuffer(base64Image);

  if (!buffer.length) {
    throw new Error('[R2] Empty buffer — invalid base64 image');
  }

  const processedBuffer = await sharp(buffer).png().toBuffer();
  const key = buildKey(prefix, projectId, type, 'png');

  await r2.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        processedBuffer,
    ContentType: 'image/png',
  }));

  const presignedUrl = await getPresignedUrl(key);
  return { key, presignedUrl };
}

/**
 * Upload image + auto-generate 300×300 WebP thumbnail.
 * Both objects are stored privately; returns presigned URLs for both.
 */
export async function uploadImageWithThumbnail(
  base64Image: string,
  prefix: string,
  projectId: string,
  type: 'original' | 'stencil'
): Promise<UploadWithThumbResult> {
  const buffer = base64ToBuffer(base64Image);

  if (!buffer.length) {
    throw new Error('[R2] Empty buffer — invalid base64 image');
  }

  const [fullBuffer, thumbnailBuffer] = await Promise.all([
    sharp(buffer).png().toBuffer(),
    sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  const key      = buildKey(prefix, projectId, type, 'png');
  const thumbKey = buildKey(prefix, projectId, 'thumbnail', 'webp');

  await Promise.all([
    r2.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        fullBuffer,
      ContentType: 'image/png',
    })),
    r2.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         thumbKey,
      Body:        thumbnailBuffer,
      ContentType: 'image/webp',
    })),
  ]);

  const [presignedUrl, thumbnailPresignedUrl] = await Promise.all([
    getPresignedUrl(key),
    getPresignedUrl(thumbKey),
  ]);

  return { key, presignedUrl, thumbnailKey: thumbKey, thumbnailPresignedUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all objects under a user's prefix.
 * Enforces isolation — prefix is always derived server-side from auth.
 */
export async function listUserObjects(prefix: string): Promise<R2Object[]> {
  const safePrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket:            BUCKET,
      Prefix:            safePrefix,
      ContinuationToken: continuationToken,
      MaxKeys:           1000,
    }));

    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Size !== undefined && obj.LastModified) {
        objects.push({
          key:          obj.Key,
          size:         obj.Size,
          lastModified: obj.LastModified,
        });
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

/** Delete a single object */
export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Delete all objects for a user (account deletion) */
export async function deleteAllUserObjects(prefix: string): Promise<void> {
  const objects = await listUserObjects(prefix);
  if (!objects.length) return;

  // R2 supports batch delete up to 1000 objects per request
  const chunks = [];
  for (let i = 0; i < objects.length; i += 1000) {
    chunks.push(objects.slice(i, i + 1000));
  }

  await Promise.all(
    chunks.map(chunk =>
      r2.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: chunk.map(o => ({ Key: o.key })) },
      }))
    )
  );
}

/** Delete all objects in a "folder" (project) */
export async function deleteProjectObjects(
  prefix: string,
  projectId: string
): Promise<void> {
  const folderPrefix = `${prefix}/${projectId}/`;
  const objects = await listUserObjects(folderPrefix);
  if (!objects.length) return;

  await r2.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: { Objects: objects.map(o => ({ Key: o.key })) },
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage usage
// ─────────────────────────────────────────────────────────────────────────────

/** Calculate total storage used by a user (in bytes) */
export async function getUserStorageBytes(prefix: string): Promise<number> {
  const objects = await listUserObjects(prefix);
  return objects.reduce((sum, obj) => sum + obj.size, 0);
}

export function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

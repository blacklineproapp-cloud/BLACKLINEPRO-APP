/**
 * BLACK LINE PRO — Direct PostgreSQL Client
 * Replaces Supabase client for database operations.
 * Uses postgres.js (https://github.com/porsager/postgres)
 *
 * Connection via DATABASE_URL (Railway / Neon / any PG provider).
 * Supabase's underlying Postgres is also accessible this way using the
 * direct connection string from: Supabase Dashboard → Settings → Database.
 */
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    '[DB] DATABASE_URL not set.\n' +
    'Set it in .env.local:\n' +
    '  DATABASE_URL=postgresql://user:password@host:5432/dbname\n' +
    'Railway: available automatically as DATABASE_URL.\n' +
    'Supabase direct: Project Settings → Database → Connection string (URI mode).'
  );
}

// Singleton — reused across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof postgres> | undefined;
}

const sql = globalThis.__db ?? postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,               // Connection pool size
  idle_timeout: 20,      // Close idle connections after 20s
  connect_timeout: 10,   // Fail fast if DB is unreachable
  transform: {
    undefined: null,     // Convert undefined → NULL automatically
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = sql;
}

export default sql;

// ─────────────────────────────────────────────────────────────────────────────
// Type exports (mirrors what was in lib/supabase.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'inactive'
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export type Plan =
  | 'free'
  | 'ink'
  | 'pro'
  | 'studio';

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_status: SubscriptionStatus;
  subscription_id?: string;
  subscription_expires_at?: string;
  is_paid: boolean;
  tools_unlocked: boolean;
  created_at: string;
  last_login: string;
  updated_at: string;
  credits: number;
  plan: Plan;
  usage_this_month?: Record<string, number>;
  daily_usage?: Record<string, number>;
  grace_period_until?: string;
  auto_bill_after_grace?: boolean;
  admin_courtesy?: boolean;
  is_blocked?: boolean;
  blocked_reason?: string;
  is_admin?: boolean;
  total_ai_requests?: number;
  last_active_at?: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;            // Clerk user ID (null for anonymous)
  anonymous_id?: string;      // Anonymous UUID (for users without account)
  r2_key: string;             // Key in Cloudflare R2
  thumbnail_key?: string;     // Thumbnail key in R2
  style: string;
  prompt?: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  stripe_payment_id: string;
  stripe_subscription_id?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  plan_type?: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper query functions
// ─────────────────────────────────────────────────────────────────────────────

/** Get user by Clerk ID */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT * FROM users WHERE clerk_id = ${clerkId} LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Get user by email */
export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Upsert user from Clerk webhook */
export async function upsertUser(data: {
  clerk_id: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<User> {
  const rows = await sql<User[]>`
    INSERT INTO users (clerk_id, email, name, picture, created_at, updated_at, last_login)
    VALUES (
      ${data.clerk_id},
      ${data.email},
      ${data.name},
      ${data.picture ?? null},
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (clerk_id) DO UPDATE SET
      email      = EXCLUDED.email,
      name       = EXCLUDED.name,
      picture    = EXCLUDED.picture,
      last_login = NOW(),
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

/** Save a generated image record */
export async function saveGeneratedImage(data: {
  user_id?: string;
  anonymous_id?: string;
  r2_key: string;
  thumbnail_key?: string;
  style: string;
  prompt?: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
}): Promise<GeneratedImage> {
  const rows = await sql<GeneratedImage[]>`
    INSERT INTO generated_images (
      user_id, anonymous_id, r2_key, thumbnail_key,
      style, prompt, width, height, file_size_bytes, created_at
    )
    VALUES (
      ${data.user_id ?? null},
      ${data.anonymous_id ?? null},
      ${data.r2_key},
      ${data.thumbnail_key ?? null},
      ${data.style},
      ${data.prompt ?? null},
      ${data.width ?? null},
      ${data.height ?? null},
      ${data.file_size_bytes ?? null},
      NOW()
    )
    RETURNING *
  `;
  return rows[0];
}

/** List generated images for a Clerk user */
export async function listUserImages(
  userId: string,
  limit = 50,
  offset = 0
): Promise<GeneratedImage[]> {
  return sql<GeneratedImage[]>`
    SELECT * FROM generated_images
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

/**
 * BLACK LINE PRO — Anonymous User Identity
 *
 * Generates and persists a UUID in localStorage for users without a Clerk account.
 * This ID is used to:
 *   - Scope local generation history
 *   - Track API key tutorial completion
 *   - Associate with paid account later (migration on signup)
 *
 * PRIVACY: This ID never leaves the browser unless the user explicitly
 * upgrades to a paid plan and chooses to migrate their history.
 */

const ANON_ID_KEY   = 'blp_anon_id';
const MIGRATED_KEY  = 'blp_anon_migrated';

/** Get or create the anonymous ID (browser only) */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

/** Check if this anonymous session has already been linked to a Clerk account */
export function isAnonymousMigrated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MIGRATED_KEY) === 'true';
}

/** Mark this anonymous session as migrated (called after Clerk signup) */
export function markAnonymousMigrated(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MIGRATED_KEY, 'true');
}

/** Clear anonymous ID (e.g. on explicit sign-out or account deletion) */
export function clearAnonymousId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ANON_ID_KEY);
  localStorage.removeItem(MIGRATED_KEY);
}

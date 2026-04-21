/**
 * Maps Supabase Auth / network failures to user-visible copy.
 * GoTrue lives on the Supabase host (`/auth/v1/*`); HTTP 500 usually indicates
 * project-side or platform issues, not bad passwords (those are typically 400).
 */
export function formatAuthError(err: unknown): string {
  if (err == null) {
    return 'Sign in failed. Please try again.';
  }

  if (typeof err === 'string' && err.trim()) {
    return mapKnownMessage(err.trim());
  }

  if (typeof err === 'object') {
    const o = err as { message?: string; status?: number; name?: string };
    const status = o.status;
    const msg = typeof o.message === 'string' ? o.message.trim() : '';

    if (status === 500 || /500|internal server error/i.test(msg)) {
      return (
        'The sign-in service returned an error (HTTP 500). ' +
        'In the Supabase Dashboard: confirm the project is not paused, Authentication is enabled, ' +
        'and your .env values match Project Settings → API (URL and anon key). ' +
        'Check Logs → Auth for server-side exceptions (e.g. failing database triggers on auth.users).'
      );
    }
    if (status === 502 || status === 503 || status === 504) {
      return 'Authentication is temporarily unavailable. Please try again in a moment.';
    }
    if (status === 429) {
      return 'Too many sign-in attempts. Please wait and try again.';
    }

    if (msg) {
      return mapKnownMessage(msg);
    }
  }

  return 'Sign in failed. Please try again.';
}

function mapKnownMessage(msg: string): string {
  if (/Invalid login credentials|invalid login credentials/i.test(msg)) {
    return 'Invalid email or password.';
  }
  return msg;
}

/**
 * useAdminGuard — hook consumed by admin page components.
 *
 * Usage in admin page:
 *   const { isAdmin, guardedCall } = useAdminGuard();
 *   // inside event handler:
 *   await guardedCall(async () => { await someAdminApi(); });
 *
 * guardedCall will:
 *   - Re-verify the user is still admin at call time (fresh JWT check)
 *   - Throw AdminUnauthorizedError (401) or AdminForbiddenError (403) if not
 *   - Otherwise execute the callback
 *
 * This means even if someone bypasses the route guard (e.g. token swap),
 * every mutating admin action re-verifies before touching data.
 */
import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { getMyProfile } from '../services/profile';

export class AdminUnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super('Not authenticated — please sign in.');
    this.name = 'AdminUnauthorizedError';
  }
}

export class AdminForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super('Access denied — admin role required.');
    this.name = 'AdminForbiddenError';
  }
}

export function useAdminGuard() {
  const { state } = useAuth();

  /**
   * isAdmin: synchronous check using role already in context.
   * Use this for conditional UI rendering only — not for security decisions.
   */
  const isAdmin = state.user?.role === 'admin';

  /**
   * assertAdmin: async check that re-validates against the DB.
   * Call this before any state-mutating admin operation.
   * Throws AdminUnauthorizedError or AdminForbiddenError on violation.
   */
  const assertAdmin = useCallback(async (): Promise<void> => {
    if (!state.user) throw new AdminUnauthorizedError();
    // Re-validate role from DB using supabase.auth.getUser() (re-checks JWT server-side)
    const profile = await getMyProfile();
    if (!profile) throw new AdminUnauthorizedError();
    if (profile.role !== 'admin') throw new AdminForbiddenError();
  }, [state.user]);

  /**
   * guardedCall: wraps an async admin operation with auth re-validation.
   * Returns { ok, data, error } so callers can handle gracefully.
   */
  const guardedCall = useCallback(
    async <T>(operation: () => Promise<T>): Promise<{ ok: true; data: T; error: null } | { ok: false; data: null; error: AdminUnauthorizedError | AdminForbiddenError | Error }> => {
      try {
        await assertAdmin();
        const data = await operation();
        return { ok: true, data, error: null };
      } catch (err) {
        const error =
          err instanceof AdminUnauthorizedError || err instanceof AdminForbiddenError
            ? err
            : err instanceof Error
            ? err
            : new Error(String(err));
        console.error('[AdminGuard] Operation blocked:', error.message);
        return { ok: false, data: null, error };
      }
    },
    [assertAdmin],
  );

  return { isAdmin, assertAdmin, guardedCall };
}

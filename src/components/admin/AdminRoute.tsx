/**
 * AdminRoute — Frontend route guard for /admin/* paths.
 *
 * Security model (defence-in-depth):
 *  1. If no authenticated user  → redirect /login       (401 equivalent)
 *  2. If role already in context and !== 'admin' → redirect / (403 equivalent)
 *  3. If role not yet in context → verify against DB via getMyProfile()
 *  4. On verification failure or role !== 'admin' → redirect /  (403 equivalent)
 *
 * NOTE: This is a UI-layer guard only. The real enforcement happens at the
 *       Supabase RLS layer (patch_rls_is_admin.sql) and edge function JWT
 *       checks. Never trust frontend guards alone.
 */
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile } from '../../services/profile';

type Gate = 'loading' | 'authorized' | 'unauthenticated' | 'forbidden';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const [gate, setGate] = useState<Gate>('loading');
  // Track the user id we last verified so re-renders don't trigger re-checks
  const verifiedForId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Step 1: Auth context still loading — wait
      if (state.isLoading) return;

      // Step 2: No session at all → 401
      if (!state.user) {
        if (!cancelled) setGate('unauthenticated');
        return;
      }

      // Step 3: Role already resolved in context (fast path — no extra round-trip)
      if (state.user.role !== undefined) {
        if (!cancelled) {
          setGate(state.user.role === 'admin' ? 'authorized' : 'forbidden');
        }
        verifiedForId.current = state.user.id;
        return;
      }

      // Step 4: Role unknown — verify freshly from DB to avoid stale context
      if (verifiedForId.current === state.user.id) {
        // Already verified this session — do not re-query
        return;
      }

      // Re-fetch from DB with the Supabase auth.getUser() call (not getSession)
      // so the JWT is re-validated server-side before trusting it.
      const profile = await getMyProfile();
      if (cancelled) return;

      verifiedForId.current = state.user.id;
      if (!profile) {
        setGate('unauthenticated');
        return;
      }
      setGate(profile.role === 'admin' ? 'authorized' : 'forbidden');
    })();

    return () => {
      cancelled = true;
    };
  }, [state.isLoading, state.user?.id, state.user?.role]);

  // ── Render states ────────────────────────────────────────────────────────────

  if (state.isLoading || gate === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-[40vh] flex flex-col items-center justify-center gap-3"
        style={{ color: 'var(--nc-on-surface-variant)' }}
      >
        <span
          className="material-symbols-outlined animate-spin"
          style={{ fontSize: '2rem', color: 'var(--nc-primary)' }}
        >
          progress_activity
        </span>
        <span className="text-sm font-medium">Verifying access…</span>
      </div>
    );
  }

  // 401 — not authenticated
  if (gate === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  // 403 — authenticated but not an admin
  if (gate === 'forbidden') {
    return <Navigate to="/" replace state={{ adminDenied: true }} />;
  }

  return <>{children}</>;
}

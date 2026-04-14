import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isCurrentUserAdmin } from '../../services/adminApi';

type Gate = 'loading' | 'ok' | 'denied';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const [gate, setGate] = useState<Gate>('loading');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!state.user) {
        if (!cancelled) setGate('denied');
        return;
      }
      const ok = await isCurrentUserAdmin();
      if (!cancelled) setGate(ok ? 'ok' : 'denied');
    })();
    return () => {
      cancelled = true;
    };
  }, [state.user?.id]);

  if (state.isLoading || gate === 'loading') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }
  if (!state.user) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }
  if (gate !== 'ok') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

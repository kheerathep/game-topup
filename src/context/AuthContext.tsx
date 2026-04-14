import React, { createContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

type AuthAction = 
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      if (!supabase) {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        dispatch({
          type: 'LOGIN',
          payload: { id: session.user.id, email: session.user.email || '' },
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }

      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, sess) => {
        if (sess?.user) {
          dispatch({
            type: 'LOGIN',
            payload: { id: sess.user.id, email: sess.user.email || '' },
          });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      });
      if (cancelled) {
        sub.unsubscribe();
        return;
      }
      subscription = sub;
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

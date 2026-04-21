import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signInWithOAuthProvider } from '../services/oauth';
import type { OAuthProvider } from '../services/oauth';
import { supabase } from '../services/supabase';
import { resolvePostLoginPath } from '../services/profile';
import { useLanguage } from '../context/LanguageContext';
import { formatAuthError } from '../utils/formatAuthError';

function PostLoginNavigate({ fallback }: { fallback: string }) {
  const [to, setTo] = useState<string | undefined>(undefined);
  useEffect(() => {
    void resolvePostLoginPath(fallback)
      .then(setTo)
      .catch(() => setTo(fallback));
  }, [fallback]);
  if (to === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--color-background] text-[--color-on-surface-variant]">
        Loading…
      </div>
    );
  }
  return <Navigate to={to} replace />;
}

export function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
  const { state: auth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
  const [oauthError, setOauthError] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);

  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthError('');
    setOauthBusy(provider);
    const { error } = await signInWithOAuthProvider(provider);
    if (error) {
      setOauthBusy(null);
      setOauthError(error.message);
    }
  };

  if (auth.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[--color-background] text-[--color-on-surface-variant]">Loading…</div>;
  }

  if (auth.user) {
    return <PostLoginNavigate fallback={redirectTo} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (mode === 'register') {
      const errors: string[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(email)) errors.push('• รูปแบบอีเมลไม่ถูกต้อง');
      if (password.length < 8) errors.push('• รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      if (!/(?=.*[a-z])/.test(password)) errors.push('• รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว');
      if (!/(?=.*[A-Z])/.test(password)) errors.push('• รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว');
      if (!/(?=.*\d)/.test(password)) errors.push('• รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว');
      if (!/(?=.*[\W_])/.test(password)) errors.push('• รหัสผ่านต้องมีตัวอักษรพิเศษอย่างน้อย 1 ตัว');
      if (password !== confirmPassword) errors.push('• รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');

      if (errors.length > 0) {
        setFormError(errors.join('\n'));
        return;
      }
    } else {
      if (password.length < 6) {
        setFormError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
    }

    if (!supabase) {
      setFormError('ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — ไม่สามารถเข้าสู่ระบบได้');
      return;
    }

    setSubmitBusy(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, name },
          },
        });
        if (error) {
          setFormError(formatAuthError(error));
          return;
        }
        if (data.session) {
          const to = await resolvePostLoginPath(redirectTo);
          navigate(to, { replace: true });
        } else {
          setFormError(
            'ส่งลิงก์ยืนยันอีเมลแล้ว กรุณาเปิดลิงก์ในอีเมล แล้วกลับมา Sign In',
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setFormError(formatAuthError(error));
          return;
        }
        if (!data.session) {
          setFormError('Sign in succeeded but no session was returned. Check Supabase Auth settings and try again.');
          return;
        }
        const to = await resolvePostLoginPath(redirectTo);
        navigate(to, { replace: true });
      }
    } catch (e) {
      setFormError(formatAuthError(e));
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-12 px-4">
        {/* Atmospheric Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[--color-primary] opacity-10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[--color-secondary-container] opacity-10 blur-[120px] rounded-full"></div>

        {/* Login Canvas */}
        <div className="w-full max-w-[480px] z-10">
          {/* Brand Anchor */}
          <div className="text-center mb-10 flex flex-col items-center">
            <Gamepad2 className="w-12 h-12 text-[--color-primary] mb-2" />
            <h1 className="font-headline text-4xl font-bold italic tracking-tighter text-white mb-2">{t('brandName')}</h1>
            <p className="font-label text-on-surface-variant tracking-widest uppercase text-[10px]">{t('brandTagline')}</p>
          </div>

          {/* Main Auth Card */}
          <div className="bg-[--color-surface-container-low]/70 backdrop-blur-xl border border-white/5 p-8 md:p-10 rounded-xl relative shadow-2xl">
            {/* Decorative Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-[--color-primary] to-transparent"></div>

            <div className="mb-8">
              <h2 className="font-headline text-2xl font-bold text-white mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {mode === 'login' ? 'Secure access to your gaming vault' : 'Join the premier destination for digital assets'}
              </p>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div className="space-y-1.5">
                   <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant px-1" htmlFor="name">Full Name</label>
                   <div className="relative group">
                     <input required value={name} onChange={(e) => setName(e.target.value)} id="name" type="text" className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none" placeholder="PlayerOne" />
                   </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant px-1" htmlFor="email">Email Address</label>
                <div className="relative group">
                  <input required value={email} onChange={(e) => setEmail(e.target.value)} id="email" type="email" className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none" placeholder="you@example.com" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end px-1">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant" htmlFor="password">Password</label>
                  {mode === 'login' && <Link to="/forgot-password" className="text-[11px] text-[--color-primary] hover:text-[--color-secondary] transition-colors">Forgot Password?</Link>}
                </div>
                <div className="relative group">
                  <input required value={password} onChange={(e) => setPassword(e.target.value)} id="password" type="password" className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none" placeholder="••••••••" />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant px-1" htmlFor="confirmPassword">Confirm Password</label>
                  <div className="relative group">
                    <input required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} id="confirmPassword" type="password" className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none" placeholder="••••••••" />
                  </div>
                </div>
              )}

              {formError && <p className="text-sm text-[--color-error] text-left whitespace-pre-line bg-error/10 p-3 rounded-lg border border-error/20">{formError}</p>}

              <button
                type="submit"
                disabled={submitBusy || oauthBusy !== null}
                className="w-full py-4 px-6 mt-4 bg-gradient-to-br from-[--color-primary] to-[--color-primary-container] text-[--color-on-primary-fixed] font-bold rounded-lg shadow-[0_0_20px_rgba(98,138,255,0.3)] active:scale-[0.98] transition-all flex justify-center items-center gap-2 group disabled:opacity-60 disabled:pointer-events-none"
              >
                {submitBusy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8 flex items-center">
              <div className="flex-grow h-px bg-white/5"></div>
              <span className="mx-4 font-label text-[10px] uppercase tracking-[0.2em] text-[--color-outline]">Or connect with</span>
              <div className="flex-grow h-px bg-white/5"></div>
            </div>

            {oauthError && (
              <p className="mb-4 text-sm text-[--color-error] text-center">{oauthError}</p>
            )}

            {/* Social Auth */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={oauthBusy !== null}
                onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-3 py-3 px-4 bg-[--color-surface-container-highest] hover:bg-[--color-surface-bright] transition-colors rounded-lg group text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 5.04c1.94 0 3.51.68 4.75 1.81l3.51-3.51C17.92 1.19 15.21 0 12 0 7.31 0 3.25 2.67 1.21 6.6L5.16 9.7c.93-2.67 3.44-4.66 6.84-4.66z" fill="#EA4335"></path>
                  <path d="M23.49 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.29h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.62 2.81c2.12-1.95 3.34-4.83 3.34-8.31z" fill="#4285F4"></path>
                  <path d="M5.16 14.3c-.24-.7-.38-1.45-.38-2.3s.14-1.6.38-2.3L1.21 6.6C.44 8.22 0 10.06 0 12s.44 3.78 1.21 5.4l3.95-3.1z" fill="#FBBC05"></path>
                  <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.62-2.81c-1.1.74-2.51 1.18-4.31 1.18-3.4 0-6.27-2.31-7.3-5.43L.84 17.13C2.8 21.2 7.07 24 12 24z" fill="#34A853"></path>
                </svg>
                <span className="text-on-surface group-hover:text-white transition-colors">
                  {oauthBusy === 'google' ? 'กำลังเปิด…' : 'Google'}
                </span>
              </button>
              <button
                type="button"
                disabled={oauthBusy !== null}
                onClick={() => handleOAuth('facebook')}
                className="flex items-center justify-center gap-3 py-3 px-4 bg-[--color-surface-container-highest] hover:bg-[--color-surface-bright] transition-colors rounded-lg group text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"></path>
                </svg>
                <span className="text-on-surface group-hover:text-white transition-colors">
                  {oauthBusy === 'facebook' ? 'กำลังเปิด…' : 'Facebook'}
                </span>
              </button>
            </div>
            
            {/* Sign Up Link inside */}
            <div className="mt-8 text-center pt-6 border-t border-white/5 text-[--color-on-surface-variant] text-sm">
              {mode === 'login' ? (
                 <>New operative? <Link to="/register" className="text-[--color-primary] font-bold hover:underline underline-offset-4 ml-1">Sign Up</Link></>
              ) : (
                 <>Already have an account? <Link to="/login" className="text-[--color-primary] font-bold hover:underline underline-offset-4 ml-1">Sign In</Link></>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex justify-center gap-6">
            <a className="text-[--color-on-surface-variant]/60 hover:text-[--color-on-surface] text-[10px] uppercase tracking-widest font-label transition-colors" href="#">Privacy Policy</a>
            <a className="text-[--color-on-surface-variant]/60 hover:text-[--color-on-surface] text-[10px] uppercase tracking-widest font-label transition-colors" href="#">Terms of Service</a>
            <a className="text-[--color-on-surface-variant]/60 hover:text-[--color-on-surface] text-[10px] uppercase tracking-widest font-label transition-colors" href="#">Help Center</a>
          </div>
        </div>
      </main>
    </div>
  );
}

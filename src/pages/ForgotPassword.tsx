import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';

type Step = 'form' | 'sent';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supabase) {
      setError('ยังไม่ได้ตั้งค่า Supabase — ไม่สามารถส่งอีเมลได้');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }

    setBusy(true);
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (sbError) {
        setError(sbError.message);
        return;
      }
      setStep('sent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center relative overflow-hidden py-12 px-4">
        {/* Atmospheric Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[--color-primary] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[--color-secondary-container] opacity-10 blur-[120px] rounded-full" />

        <div className="w-full max-w-[480px] z-10">
          {/* Brand Anchor */}
          <div className="text-center mb-10 flex flex-col items-center">
            <Gamepad2 className="w-12 h-12 text-[--color-primary] mb-2" />
            <h1 className="font-headline text-4xl font-bold italic tracking-tighter text-white mb-2">
              GameVault
            </h1>
            <p className="font-label text-on-surface-variant tracking-widest uppercase text-[10px]">
              PREMIUM GAMING MARKETPLACE
            </p>
          </div>

          {/* Card */}
          <div className="bg-[--color-surface-container-low]/70 backdrop-blur-xl border border-white/5 p-8 md:p-10 rounded-xl relative shadow-2xl">
            {/* Decorative Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-[--color-primary] to-transparent" />

            {step === 'form' ? (
              <>
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[--color-primary]/10 border border-[--color-primary]/20 mx-auto mb-4">
                    <Mail className="w-7 h-7 text-[--color-primary]" />
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-white text-center mb-1">
                    ลืมรหัสผ่าน?
                  </h2>
                  <p className="text-on-surface-variant text-sm text-center leading-relaxed">
                    กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้คุณ
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label
                      className="font-label text-xs uppercase tracking-wider text-on-surface-variant px-1"
                      htmlFor="forgot-email"
                    >
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      placeholder="you@example.com"
                      className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none disabled:opacity-60"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-[--color-error] bg-error/10 p-3 rounded-lg border border-error/20">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-4 px-6 mt-2 bg-gradient-to-br from-[--color-primary] to-[--color-primary-container] text-[--color-on-primary-fixed] font-bold rounded-lg shadow-[0_0_20px_rgba(98,138,255,0.3)] active:scale-[0.98] transition-all flex justify-center items-center gap-2 group disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {busy ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        กำลังส่ง…
                      </>
                    ) : (
                      <>
                        ส่งลิงก์รีเซ็ตรหัสผ่าน
                        <Mail className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-white mb-3">
                  ส่งอีเมลแล้ว!
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                  เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่
                </p>
                <p className="text-[--color-primary] font-semibold text-sm mb-6 break-all">
                  {email}
                </p>
                <p className="text-on-surface-variant text-xs leading-relaxed bg-[--color-surface-container-highest] p-3 rounded-lg">
                  กรุณาตรวจสอบกล่องจดหมาย (รวมถึง Spam/Junk) และคลิกลิงก์ภายใน 1 ชั่วโมง
                </p>
                <button
                  onClick={() => { setStep('form'); setEmail(''); setError(''); }}
                  className="mt-6 text-sm text-[--color-primary] hover:text-[--color-secondary] transition-colors underline underline-offset-4"
                >
                  ส่งอีเมลอีกครั้ง
                </button>
              </div>
            )}

            {/* Back to Login */}
            <div className="mt-8 text-center pt-6 border-t border-white/5">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[--color-on-surface-variant] hover:text-[--color-primary] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                กลับไปหน้า Sign In
              </Link>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 flex justify-center gap-6">
            <a className="text-[--color-on-surface-variant]/60 hover:text-[--color-on-surface] text-[10px] uppercase tracking-widest font-label transition-colors" href="#">Privacy Policy</a>
            <a className="text-[--color-on-surface-variant]/60 hover:text-[--color-on-surface] text-[10px] uppercase tracking-widest font-label transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </main>
    </div>
  );
}

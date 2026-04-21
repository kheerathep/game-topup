import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase sends the access_token in the URL hash after the user clicks the reset link.
  // onAuthStateChange with event PASSWORD_RECOVERY fires automatically.
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via the magic link — they are now in a session that allows updating password.
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const getStrengthLevel = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[\W_]/.test(pwd)) score++;
    return score;
  };

  const strengthLevel = getStrengthLevel(password);
  const strengthLabels = ['', 'อ่อนมาก', 'อ่อน', 'ปานกลาง', 'แข็งแกร่ง', 'แข็งแกร่งมาก'];
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors: string[] = [];
    if (password.length < 8) errors.push('• รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
    if (!/(?=.*[a-z])/.test(password)) errors.push('• ต้องมีตัวอักษรพิมพ์เล็ก (a-z)');
    if (!/(?=.*[A-Z])/.test(password)) errors.push('• ต้องมีตัวอักษรพิมพ์ใหญ่ (A-Z)');
    if (!/(?=.*\d)/.test(password)) errors.push('• ต้องมีตัวเลข (0-9)');
    if (!/(?=.*[\W_])/.test(password)) errors.push('• ต้องมีอักขระพิเศษ (เช่น @, #, !)');
    if (password !== confirmPassword) errors.push('• รหัสผ่านและการยืนยันไม่ตรงกัน');

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    if (!supabase) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }

    setBusy(true);
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password });
      if (sbError) {
        setError(sbError.message);
        return;
      }
      setDone(true);
      // Redirect to login after a short delay
      setTimeout(() => navigate('/login', { replace: true }), 3500);
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

            {done ? (
              /* Success */
              <div className="text-center py-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-white mb-3">
                  รีเซ็ตรหัสผ่านสำเร็จ!
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  รหัสผ่านของคุณได้รับการอัปเดตแล้ว<br />กำลังพาไปยังหน้า Sign In…
                </p>
                <div className="w-full h-1 bg-[--color-surface-container-highest] rounded-full overflow-hidden">
                  <div className="h-full bg-[--color-primary] rounded-full animate-[progress_3.5s_linear_forwards]" style={{ width: '0%', animation: 'progress 3.5s linear forwards' }} />
                </div>
                <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[--color-primary]/10 border border-[--color-primary]/20 mx-auto mb-4">
                    <Lock className="w-7 h-7 text-[--color-primary]" />
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-white text-center mb-1">
                    ตั้งรหัสผ่านใหม่
                  </h2>
                  <p className="text-on-surface-variant text-sm text-center leading-relaxed">
                    กรอกรหัสผ่านใหม่ที่ต้องการ ให้แน่ใจว่ารหัสผ่านมีความปลอดภัยเพียงพอ
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label
                      className="font-label text-xs uppercase tracking-wider text-on-surface-variant px-1"
                      htmlFor="new-password"
                    >
                      รหัสผ่านใหม่
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                        placeholder="••••••••"
                        className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 pr-12 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-outline] hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength Meter */}
                    {password.length > 0 && (
                      <div className="px-1 space-y-1">
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: i <= strengthLevel ? strengthColors[strengthLevel] : 'rgba(255,255,255,0.08)',
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-right" style={{ color: strengthColors[strengthLevel] }}>
                          {strengthLabels[strengthLevel]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label
                      className="font-label text-xs uppercase tracking-wider text-on-surface-variant px-1"
                      htmlFor="confirm-new-password"
                    >
                      ยืนยันรหัสผ่านใหม่
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-new-password"
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={busy}
                        placeholder="••••••••"
                        className="w-full bg-[--color-surface-container-highest] border-none text-white px-4 py-3.5 pr-12 rounded-lg focus:ring-1 focus:ring-[--color-secondary]/40 placeholder-[--color-outline-variant] transition-all outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-outline] hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Match Indicator */}
                    {confirmPassword.length > 0 && (
                      <p className={`text-[11px] px-1 ${password === confirmPassword ? 'text-green-400' : 'text-[--color-error]'}`}>
                        {password === confirmPassword ? '✓ รหัสผ่านตรงกัน' : '✗ รหัสผ่านไม่ตรงกัน'}
                      </p>
                    )}
                  </div>

                  {error && (
                    <p className="text-sm text-[--color-error] bg-error/10 p-3 rounded-lg border border-error/20 whitespace-pre-line">
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
                        กำลังบันทึก…
                      </>
                    ) : (
                      <>
                        บันทึกรหัสผ่านใหม่
                        <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Back Link */}
            {!done && (
              <div className="mt-8 text-center pt-6 border-t border-white/5">
                <Link
                  to="/login"
                  className="text-sm text-[--color-on-surface-variant] hover:text-[--color-primary] transition-colors"
                >
                  ยกเลิก — กลับไปหน้า Sign In
                </Link>
              </div>
            )}
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

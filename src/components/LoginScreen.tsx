import { FormEvent, useState } from 'react';
import { ArrowRight, AtSign, Check, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { AuthStatus } from '../types/portal';
import { BrandEmblem, BrandWordmark } from './BrandWordmark';

interface LoginScreenProps {
  authStatus: AuthStatus | null;
  onSetupCoach: (input: {
    email: string;
    password: string;
    fullName: string;
    rememberMe: boolean;
  }) => Promise<string | null>;
  onSignIn: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<string | null>;
}

export function LoginScreen({
  authStatus,
  onSetupCoach,
  onSignIn,
}: LoginScreenProps) {
  const needsSetup = authStatus?.needsSetup ?? false;

  const [fullName, setFullName] = useState('Coach Danny');
  const [email, setEmail] = useState('coach.danny@dannysthenics.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid coach email address.');
      return;
    }
    if (needsSetup) {
      if (password.length < 6) {
        setError('Choose a password with at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setError(null);
      setSubmitting(true);
      const errMsg = await onSetupCoach({
        email: email.trim(),
        password,
        fullName: fullName.trim() || 'Coach Danny',
        rememberMe,
      });
      setSubmitting(false);
      if (errMsg) setError(errMsg);
      return;
    }

    if (!password) {
      setError('Enter your coach workstation password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const errMsg = await onSignIn(email.trim(), password, rememberMe);
    setSubmitting(false);
    if (errMsg) setError(errMsg);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] relative overflow-hidden">
      {/* Subtle architectural emerald atmosphere */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(9, 13, 22, 0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* Top Brand Strip */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#0B0F19]/80 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center gap-3.5">
          <BrandEmblem className="w-9 h-9" />
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#4EDEA3] whitespace-nowrap">
            Calisthenics &amp; Conditioning
          </span>
        </div>
      </header>

      {/* Main Centered Coach Login Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-[0.06em] text-[#DFE2EF]">
            Welcome To
          </p>
          <div className="mt-1.5 flex justify-center">
            <BrandWordmark size="xl" />
          </div>
          <p className="mt-3 text-sm sm:text-base text-[#9AA7B8] leading-relaxed">
            {needsSetup
              ? 'Create your initial coach admin login to secure the workstation.'
              : 'Sign in to access your coaching workstation, roster directory, and attendance logs.'}
          </p>
        </div>

        <section
          aria-labelledby="coach-login-heading"
          className="w-full max-w-[460px] rounded-lg border border-white/[0.10] bg-[#161A26]/95 p-6 sm:p-8 backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1
                id="coach-login-heading"
                className="font-display text-xl font-bold uppercase tracking-[0.03em] text-[#DFE2EF]"
              >
                {needsSetup ? 'Initialize Coach Admin' : 'Coach Login'}
              </h1>
              <p className="mt-1.5 text-sm text-[#9AA7B8]">
                {needsSetup
                  ? 'Set your email and password once to lock the workstation.'
                  : 'Enter your credentials to access the coaching workstation.'}
              </p>
            </div>
            {needsSetup && (
              <span className="w-9 h-9 rounded-md bg-[#10B981]/15 border border-[#10B981]/35 text-[#4EDEA3] inline-flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            {needsSetup && (
              <div>
                <label
                  htmlFor="coach-name"
                  className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#9AA7B8] mb-2"
                >
                  Coach Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="coach-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Coach Danny"
                    className="w-full h-11 pl-10 pr-3.5 rounded bg-[#232938] border border-white/[0.09] text-sm text-[#DFE2EF] placeholder:text-[#64748B] focus:border-[#10B981]/70 kinetic-focus transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="coach-email"
                className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#9AA7B8] mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="coach-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="coach.danny@dannysthenics.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded bg-[#232938] border border-white/[0.09] text-sm font-mono text-[#DFE2EF] placeholder:text-[#64748B] focus:border-[#10B981]/70 kinetic-focus transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="coach-password"
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#9AA7B8]"
                >
                  {needsSetup ? 'Create Password' : 'Password'}
                </label>
                {!needsSetup && (
                  <button
                    type="button"
                    onClick={() => setResetNotice((prev) => !prev)}
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4EDEA3] hover:text-[#6FFBEE] transition-colors whitespace-nowrap"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="coach-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={needsSetup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={needsSetup ? 'Minimum 6 characters' : 'Enter password'}
                  className="w-full h-11 pl-10 pr-11 rounded bg-[#232938] border border-white/[0.09] text-sm font-mono text-[#DFE2EF] placeholder:text-[#64748B] focus:border-[#10B981]/70 kinetic-focus transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#9AA7B8] hover:text-[#DFE2EF] transition-colors rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div>
                <label
                  htmlFor="coach-confirm-password"
                  className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#9AA7B8] mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="coach-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Re-enter password"
                    className="w-full h-11 pl-10 pr-3.5 rounded bg-[#232938] border border-white/[0.09] text-sm font-mono text-[#DFE2EF] placeholder:text-[#64748B] focus:border-[#10B981]/70 kinetic-focus transition-colors"
                  />
                </div>
              </div>
            )}

            {resetNotice && !needsSetup && (
              <div className="rounded border border-[#10B981]/35 bg-[#10B981]/10 px-3.5 py-2.5 text-xs text-[#BBF7D0]">
                Contact your studio administrator or update the password hash in your
                MySQL <span className="font-mono">coaches</span> table (or set{' '}
                <span className="font-mono">COACH_ADMIN_PASSWORD</span> on the server).
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded border border-[#EF4444]/40 bg-[#EF4444]/12 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
              >
                {error}
              </div>
            )}

            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                onClick={() => setRememberMe((prev) => !prev)}
                className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                  rememberMe
                    ? 'bg-[#10B981] border-[#10B981] text-[#052418]'
                    : 'bg-[#232938] border-white/20 text-transparent'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>
              <span className="text-sm text-[#DFE2EF]">Keep session active longer</span>
            </label>

            <button
              type="submit"
              disabled={submitting || authStatus === null}
              className="w-full h-12 rounded bg-[#10B981] hover:bg-[#22C55E] disabled:opacity-50 active:scale-[0.99] text-[#062418] font-mono text-sm font-bold uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 transition-all duration-150 kinetic-focus"
            >
              {submitting
                ? 'Authenticating...'
                : needsSetup
                  ? 'Create Account & Enter'
                  : 'Log In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-4 px-6 text-center text-xs text-[#64748B]">
        &copy; 2026 DANNY&apos;STHENICS Coach Pro &middot; Calisthenics &amp; Conditioning Studio
      </footer>
    </div>
  );
}

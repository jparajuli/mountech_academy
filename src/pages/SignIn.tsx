import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Mail, Lock, User as UserIcon, ArrowRight, Eye, EyeOff, Sparkles, 
  GraduationCap, CheckCircle, RefreshCw, Smartphone, ChevronRight, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { registerUser, loginUser, setToken, resendVerification } from '../api';
// @ts-ignore
import brandLogo from '../assets/images/mountech_logo_1781293059155.jpg';

interface SignInProps {
  onSignInSuccess: (user: User) => void;
}

export default function SignIn({ onSignInSuccess }: SignInProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email verification workflow states
  const [verificationPending, setVerificationPending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [sandboxVerifyUrl, setSandboxVerifyUrl] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Monitor for incoming verification redirect query callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccessMsg('Your email address has been successfully verified! You may log in below.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const DEMO_EMAIL = 'student@mountech.academy';
  const DEMO_PASSWORD = 'password123';

  const handleAutofill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setName('Mountech Scholar');
    setError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Name is required for registering an account.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const response = await registerUser(normalizedEmail, name.trim(), password);
        setPendingEmail(normalizedEmail);
        setSandboxVerifyUrl(response.verificationLink || '');
        setVerificationPending(true);
        setSuccessMsg(response.message || 'Mountech registration complete. A verification link is active.');
      } else {
        const response = await loginUser(normalizedEmail, password);
        setToken(response.token);
        onSignInSuccess(response.user);
      }
    } catch (err: any) {
      if (err.message === 'unverified') {
        setPendingEmail(normalizedEmail);
        setVerificationPending(true);
        setSuccessMsg('Your email address requires verification before logging in.');
        
        // Asynchronously call resend to prefetch the verification URL for development convenience
        resendVerification(normalizedEmail)
          .then((res) => {
            if (res.verificationLink) {
              setSandboxVerifyUrl(res.verificationLink);
            }
          })
          .catch(() => {});
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials or try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError('');
    try {
      const response = await resendVerification(pendingEmail);
      if (response.verificationLink) {
        setSandboxVerifyUrl(response.verificationLink);
      }
      setResendSuccess(true);
      setSuccessMsg(response.message || 'A fresh verification link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit resend request.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleInstantVerify = async () => {
    if (!sandboxVerifyUrl) return;
    setResendLoading(true);
    setError('');
    try {
      const response = await fetch(sandboxVerifyUrl);
      if (response.ok) {
        setResendSuccess(true);
        setSuccessMsg('Account verified successfully! You can now proceed to log in.');
        setSandboxVerifyUrl('');
      } else {
        setError('Failed to trigger instant server-side verification.');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing verification channel.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'Google' | 'GitHub') => {
    setLoading(true);
    setError('');
    
    // Simulate real social oauth session
    setTimeout(() => {
      setLoading(false);
      const emailVal = `oauth-student-${provider.toLowerCase()}@mountech.academy`;
      const nameVal = `${provider} Student`;
      
      // Seed dynamically via register
      registerUser(emailVal, nameVal, "oauth_secure_pwd_123$")
        .then((res) => {
          setToken(res.token);
          onSignInSuccess(res.user);
        })
        .catch(() => {
          // If already registered, login
          loginUser(emailVal, "oauth_secure_pwd_123$")
            .then((res) => {
              setToken(res.token);
              onSignInSuccess(res.user);
            })
            .catch((err) => {
              setError(err.message || 'Social authentication handshake failed.');
            });
        });
    }, 1000);
  };

  return (
    <div id="signin-root" className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 md:p-8 font-sans">
      
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px] relative">
        
        {/* Left Side: Auth Form */}
        <div id="auth-form-column" className="p-8 md:p-12 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center text-[20px] font-extrabold tracking-tight mb-8">
              <img src={brandLogo} alt="Mountech Academy Logo" className="w-8 h-8 rounded-lg object-cover mr-2 select-none border border-gray-150 shrink-0" referrerPolicy="no-referrer" />
              <span className="text-[#0070f3]">Mountech</span>
              <span className="text-[#111827] ml-0.5">Academy</span>
            </div>

            {verificationPending ? (
              <div id="verification-pending-view" className="space-y-6">
                <div className="w-12 h-12 bg-blue-50 text-[#0070f3] rounded-full flex items-center justify-center">
                  <Inbox className="w-6 h-6 animate-bounce text-[#0070f3]" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-[#111827]">Check your email</h3>
                  <p className="text-xs text-gray-550 mt-1 leading-relaxed">
                    We've sent a verification link to <span className="font-bold text-[#111827]">{pendingEmail}</span>. Please verify your address to activate your scholar profile.
                  </p>
                </div>

                {successMsg && (
                  <div className="p-3 bg-blue-50 border border-blue-100 text-[#0070f3] rounded-lg text-xs font-semibold leading-relaxed">
                    🔔 {successMsg}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold leading-relaxed">
                    ❌ {error}
                  </div>
                )}

                {/* Simulated Developer Sandbox Tool */}
                {sandboxVerifyUrl && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-100/80 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-800">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>DEVELOPER VERIFICATION HARNESS</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-normal">
                      Local SMTP is unconfigured. The Mountech backend has automatically intercepted the real verification token in the developer sandbox. Click below to verify instantly.
                    </p>
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={handleInstantVerify}
                      className="w-full bg-[#111827] hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>⚡ Instant Verify Account</span>
                    </button>
                  </div>
                )}

                <div className="space-y-3 pt-4">
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={handleResend}
                    className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer animate-none"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                    <span>{resendLoading ? 'Sending link...' : 'Resend Verification Mail'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVerificationPending(false);
                      setIsSignUp(false);
                      setError('');
                      setSuccessMsg('');
                      setSandboxVerifyUrl('');
                    }}
                    className="w-full text-center text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Headers */}
                <h2 id="auth-welcome-header" className="text-2xl font-bold text-[#111827] tracking-tight mb-1.5">
                  {isSignUp ? 'Create your account' : 'Welcome back, scholar'}
                </h2>
                <p className="text-gray-500 text-xs md:text-sm mb-6">
                  {isSignUp 
                    ? 'Join thousands of developers building the future of advanced software and AI.' 
                    : 'Access 100+ short-courses and professional certifications.'}
                </p>

                {/* Error Message */}
                {error && (
                  <div id="auth-error-alert" className="p-3 mb-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {successMsg && (
                  <div id="auth-success-alert" className="p-3 mb-4 bg-blue-50 border border-blue-100 text-[#0070f3] rounded-lg text-xs font-semibold">
                    {successMsg}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {isSignUp && (
                      <motion.div
                        id="input-name-wrapper"
                        initial={{ opacity: 0, y: -15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.15 }}
                      >
                        <label className="block text-[10px] font-mono text-[#6b7280] uppercase tracking-wider mb-1 font-semibold">Your Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            id="input-name"
                            type="text"
                            required
                            placeholder="Elizabeth Mountech"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-sm text-[#111827] placeholder-gray-405 rounded-lg pl-10 pr-4 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] focus:bg-white transition-all shadow-2xs"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-[10px] font-mono text-[#6b7280] uppercase tracking-wider mb-1 font-semibold">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="input-email"
                        type="email"
                        required
                        placeholder="student@mountech.academy"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-sm text-[#111827] placeholder-gray-405 rounded-lg pl-10 pr-4 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#6b7280] uppercase tracking-wider mb-1 font-semibold">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="input-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-sm text-[#111827] placeholder-gray-405 rounded-lg pl-10 pr-10 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-[#0070f3] focus:border-[#0070f3] focus:bg-white transition-all shadow-2xs"
                      />
                      <button
                        id="toggle-password-btn"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="submit-auth-button"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0070f3] hover:bg-[#0051b3] text-white font-semibold rounded-lg text-sm transition-all duration-200 py-2.5 mt-2 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isSignUp ? 'Create Academy Account' : 'Sign In Now'}</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </form>

                {/* Separator / OR */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-gray-150" />
                  <span className="px-3 text-[10px] font-mono text-gray-400 font-bold uppercase">Or continue with</span>
                  <div className="flex-1 border-t border-gray-150" />
                </div>

                {/* OAuth Sign-Ins */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    id="oauth-google"
                    type="button"
                    disabled={loading}
                    onClick={() => handleOAuthLogin('Google')}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-[#f9fafb] transition-all cursor-pointer shadow-3xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    id="oauth-github"
                    type="button"
                    disabled={loading}
                    onClick={() => handleOAuthLogin('GitHub')}
                    className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-[#f9fafb] transition-all cursor-pointer shadow-3xs"
                  >
                    <svg className="w-4 h-4 fill-slate-800" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bottom toggle state */}
          <div className="pt-6 border-t border-gray-150 flex flex-col gap-4 text-center">
            {!verificationPending && (
              <p className="text-xs text-gray-550">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  id="toggle-auth-state-button"
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-[#0070f3] font-bold hover:underline cursor-pointer"
                >
                  {isSignUp ? 'Sign in' : 'Start learning free'}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Informational Banner */}
        <div id="auth-banner-column" className="bg-[#f9fafb] border-l border-gray-150 p-12 hidden md:flex flex-col justify-between relative">
          
          <div>
            {/* Tagline */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0070f3]/10 rounded-full text-[10px] font-mono tracking-wider text-[#0070f3] font-bold uppercase mb-6">
              <Sparkles className="w-3 h-3" />
              <span>THE GLOBAL TECH FRONTIER</span>
            </div>

            {/* Inspiration Quote */}
            <div className="relative mt-4">
              <span className="text-6xl font-serif text-gray-200 absolute -left-6 -top-6">“</span>
              <p className="text-sm md:text-base text-[#4b5563] font-sans tracking-wide leading-relaxed relative z-10 font-bold italic">
                Technology is not just a tool; it is the ultimate language of problem-solving. At Mountech Academy, we empower engineers and leaders to write code that scales, design modular intelligence, and pave trails in high-performance computing.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0070f3]/10 text-brand-blue flex items-center justify-center font-bold text-xl shrink-0">
                  <GraduationCap className="w-5 h-5 text-[#0070f3]" />
                </div>
                <div>
                  <h4 className="text-[#111827] font-bold text-xs md:text-sm">Board of Trustees</h4>
                  <p className="text-gray-400 text-[10px]">Mountech Academy</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Quick Demo Credentials Box */}
            <div id="demo-credentials-box" className="p-4 bg-white border border-gray-200 rounded-xl space-y-2 shadow-3xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-[#0070f3] font-bold">DEMO ACCOUNT</span>
                <button
                  id="autofill-demo-btn"
                  type="button"
                  onClick={handleAutofill}
                  className="text-[10px] text-[#0070f3] hover:underline font-bold cursor-pointer"
                >
                  Auto-fill Form
                </button>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-[#4b5563]">{DEMO_EMAIL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Password:</span>
                  <span className="text-[#4b5563]">{DEMO_PASSWORD}</span>
                </div>
              </div>
            </div>

            {/* Trusted by label */}
            <div className="mt-8">
              <span className="text-[9px] font-mono text-gray-400 tracking-widest font-bold block uppercase mb-3">Partner Infrastructure</span>
              <div className="grid grid-cols-4 gap-4 items-center text-gray-450 text-center text-[10px] font-mono font-semibold">
                <span>OPENAI</span>
                <span>MICROSOFT</span>
                <span>AWS</span>
                <span>PINECONE</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

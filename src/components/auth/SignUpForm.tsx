import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, Loader2, Check, KeyRound, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { User } from '../../types';

interface SignUpFormProps {
  onRegisterUser: (user: User) => void;
  googleSignupSession?: { id: string; email: string; name: string } | null;
  onSwitchToSignIn: () => void;
}

type Step = 'email' | 'otp' | 'details';

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onRegisterUser,
  googleSignupSession,
  onSwitchToSignIn
}) => {
  const [step, setStep] = useState<Step>(googleSignupSession ? 'details' : 'email');
  const [email, setEmail] = useState(googleSignupSession?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState(googleSignupSession?.name || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  useEffect(() => {
    if (googleSignupSession?.email) {
      setEmail(googleSignupSession.email);
      setStep('details');
    }
    if (googleSignupSession?.name) {
      setName(googleSignupSession.name);
    }
  }, [googleSignupSession]);

  // Username availability check
  useEffect(() => {
    if (step !== 'details') return;
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    const checkAvailability = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data, error: err } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', cleanUsername)
            .maybeSingle();

          if (err) throw err;
          setUsernameAvailable(!data);
        } else {
          setUsernameAvailable(true);
        }
      } catch (err) {
        console.error('Username check failed:', err);
        setUsernameAvailable(true);
      } finally {
        setUsernameChecking(false);
      }
    };

    const timer = setTimeout(checkAvailability, 400);
    return () => clearTimeout(timer);
  }, [username, step]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Check if an active account profile already exists with this email
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', targetEmail)
          .maybeSingle();

        if (profileCheckError) throw profileCheckError;

        if (existingProfile) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        // 2. Send 6-digit OTP code to the email address
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: {
            shouldCreateUser: true
          }
        });

        if (otpError) throw otpError;

        setStep('otp');
      } else {
        throw new Error('Database backend is not connected.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code to your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = otpCode.trim();
    if (!token) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Try verifying with type 'signup' first, fallback to 'email' or 'magiclink'
        let verifySuccess = false;

        const { error: verifyError1 } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token,
          type: 'signup'
        });

        if (!verifyError1) {
          verifySuccess = true;
        } else {
          const { error: verifyError2 } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token,
            type: 'email'
          });
          if (!verifyError2) {
            verifySuccess = true;
          } else {
            const { error: verifyError3 } = await supabase.auth.verifyOtp({
              email: email.trim().toLowerCase(),
              token,
              type: 'magiclink'
            });
            if (!verifyError3) verifySuccess = true;
            else throw verifyError1;
          }
        }

        if (verifySuccess) {
          setStep('details');
        }
      } else {
        throw new Error('Database backend is not connected.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Account Registration
  const handleSignUpDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    if (usernameAvailable === false) {
      setError('This username is already taken. Please choose another.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      if (isSupabaseConfigured && supabase) {
        let authUserId = googleSignupSession?.id || '';

        // If not a Google session, get authenticated user ID or sign up / update password
        if (!googleSignupSession) {
          const { data: sessionData } = await supabase.auth.getUser();
          if (sessionData?.user) {
            authUserId = sessionData.user.id;
            // Update password for the user in Supabase Auth
            await supabase.auth.updateUser({
              password,
              data: {
                username: cleanUsername,
                name: name.trim() || cleanUsername
              }
            });
          } else {
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: email.trim().toLowerCase(),
              password,
              options: {
                data: {
                  username: cleanUsername,
                  name: name.trim() || cleanUsername
                }
              }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Registration failed.');
            authUserId = authData.user.id;
          }
        }

        const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`;

        // Clean slate guarantee for new sign-ups: purge any old/stale records associated with this authUserId
        await supabase.from('stories').delete().eq('user_id', authUserId);
        await supabase.from('highlights').delete().eq('user_id', authUserId);
        await supabase.from('story_highlights').delete().eq('user_id', authUserId);
        await supabase.from('relationships').delete().eq('follower_id', authUserId);
        await supabase.from('relationships').delete().eq('target_id', authUserId);
        await supabase.from('follows').delete().eq('follower_id', authUserId);
        await supabase.from('follows').delete().eq('following_id', authUserId);
        await supabase.from('follow_requests').delete().eq('requester_id', authUserId);
        await supabase.from('follow_requests').delete().eq('target_id', authUserId);
        await supabase.from('notifications').delete().eq('recipient_id', authUserId);
        await supabase.from('notifications').delete().eq('actor_id', authUserId);
        await supabase.from('notifications').delete().eq('user_id', authUserId);
        await supabase.from('streaks').delete().eq('user_id', authUserId);
        await supabase.from('streaks').delete().eq('partner_id', authUserId);
        await supabase.from('call_history').delete().eq('caller_id', authUserId);
        await supabase.from('call_history').delete().eq('receiver_id', authUserId);
        await supabase.from('messages').delete().eq('sender_id', authUserId);
        await supabase.from('messages').delete().eq('receiver_id', authUserId);
        await supabase.from('chat_rooms').delete().eq('creator_id', authUserId);
        await supabase.from('chat_rooms').delete().contains('members', [authUserId]);

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUserId,
            username: cleanUsername,
            email: email.trim().toLowerCase(),
            name: name.trim() || cleanUsername,
            bio: 'Hey there! I am using Be-Live ✨',
            avatar: defaultAvatar,
            color: '#C4B99D',
            is_private: false,
            is_anonymous_mode: false
          });

        if (profileError) throw profileError;

        const registeredUser: User = {
          id: authUserId,
          username: cleanUsername,
          email: email.trim().toLowerCase(),
          name: name.trim() || cleanUsername,
          bio: 'Hey there! I am using Be-Live ✨',
          avatar: defaultAvatar,
          color: '#C4B99D',
          isPrivate: false,
          isAnonymousMode: false,
          followers: [],
          following: []
        };

        // Deliberately hold welcome screen for at least 3 seconds (3000ms)
        const elapsed = Date.now() - startTime;
        const minDisplayTime = 3000;
        if (elapsed < minDisplayTime) {
          await new Promise((resolve) => setTimeout(resolve, minDisplayTime - elapsed));
        }

        onRegisterUser(registeredUser);
      } else {
        throw new Error('Database backend is not connected.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/60 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: EMAIL INPUT */}
      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase mb-2">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f0f4f9] text-stone-900 font-medium text-sm rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#C4B99D] hover:bg-[#d4c9ad] text-stone-950 font-bold text-xs uppercase tracking-[0.25em] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C4B99D]/20 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>SEND VERIFICATION CODE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: VERIFY EMAIL OTP */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">
            We transmitted a security verification code to <strong className="text-[#C4B99D]">{email}</strong>.
          </p>

          <div>
            <label className="block text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase mb-2">
              VERIFICATION CODE
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full bg-[#f0f4f9] text-stone-900 font-bold text-lg rounded-2xl pl-11 pr-4 py-3.5 tracking-widest focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1 cursor-pointer font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-[#C4B99D] hover:bg-[#d4c9ad] text-stone-950 font-bold text-xs uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-[#C4B99D]/20 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>VERIFY CODE</span>}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: USERNAME, DISPLAY NAME, PASSWORD */}
      {step === 'details' && (
        <form onSubmit={handleSignUpDetails} className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Email verified: <strong>{email}</strong></span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase mb-2">
              USERNAME
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-[#f0f4f9] text-stone-900 font-medium text-sm rounded-2xl pl-11 pr-11 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameChecking && <Loader2 className="w-4 h-4 animate-spin text-stone-500" />}
                {!usernameChecking && usernameAvailable === true && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
            </div>
            {usernameAvailable === false && (
              <p className="text-[11px] text-rose-400 mt-1">Username is already taken.</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase mb-2">
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#f0f4f9] text-stone-900 font-medium text-sm rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase mb-2">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f0f4f9] text-stone-900 font-medium text-sm rounded-2xl pl-11 pr-11 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || usernameAvailable === false}
            className="w-full py-4 bg-[#C4B99D] hover:bg-[#d4c9ad] text-stone-950 font-bold text-xs uppercase tracking-[0.25em] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C4B99D]/20 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>CREATE ACCOUNT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Switch to Sign In */}
      <div className="text-center pt-3">
        <p className="text-xs text-stone-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-[#C4B99D] font-bold underline underline-offset-4 hover:text-white transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>

      {/* FULL-SCREEN LUXURY ACCOUNT CREATION BUFFERING OVERLAY */}
      {loading && step === 'details' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070707]/95 backdrop-blur-xl p-6 text-center animate-in fade-in duration-300">
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#C4B99D]/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#C4B99D] border-r-transparent border-b-[#C4B99D]/40 border-l-transparent animate-spin" />
            <Sparkles className="w-10 h-10 text-[#C4B99D] animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif text-[#C4B99D] uppercase tracking-[0.25em] font-light mb-3 drop-shadow-[0_0_20px_rgba(196,185,157,0.3)]">
            Welcome to the world of people who are truly alive ✨
          </h2>
          <p className="text-xs text-stone-400 font-light tracking-wider max-w-sm leading-relaxed">
            Initializing your personal digital lounge & securing authentication session...
          </p>
        </div>
      )}
    </div>
  );
};

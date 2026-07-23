import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, KeyRound, ArrowLeft, ArrowRight, AlertCircle, X, Check, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { User } from '../../types';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotResetEmail, setForgotResetEmail] = useState('');
  const [forgotOtpToken, setForgotOtpToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!forgotIdentifier.trim()) {
      setError('Please enter your email or username.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        let targetEmail = forgotIdentifier.trim();

        if (!targetEmail.includes('@')) {
          const { data: profile, error: queryError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', targetEmail.toLowerCase())
            .maybeSingle();

          if (queryError) throw queryError;
          if (!profile || !profile.email) {
            throw new Error('No user with this username was found.');
          }
          targetEmail = profile.email;
        } else {
          const { data: profile, error: queryError } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', targetEmail)
            .maybeSingle();

          if (queryError) throw queryError;
          if (!profile) {
            throw new Error('No account associated with this email was found.');
          }
        }

        setForgotResetEmail(targetEmail);

        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: {
            shouldCreateUser: false
          }
        });
        if (otpError) throw otpError;

        setForgotStep('verify');
      } catch (err: any) {
        setError(err.message || 'Failed to search for user account.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Database backend is not connected.');
      setLoading(false);
    }
  };

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!forgotOtpToken.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: forgotResetEmail,
          token: forgotOtpToken.trim(),
          type: 'recovery'
        });

        if (verifyError) throw verifyError;
        setForgotStep('reset');
      } catch (err: any) {
        setError(err.message || 'Invalid or expired verification code.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Database backend is not connected.');
      setLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resetPassword || resetPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (resetPassword !== confirmResetPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: resetPassword
        });
        if (updateError) throw updateError;

        let queryId = '';
        let queryEmail = forgotResetEmail;
        if (!queryEmail) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            queryId = authUser.id;
            queryEmail = authUser.email || '';
          }
        }

        const query = supabase.from('profiles').select('id, username, email, name, bio, avatar, color, is_private, is_anonymous_mode, avatar_config');
        if (queryId) {
          query.eq('id', queryId);
        } else {
          query.eq('email', queryEmail);
        }

        const { data: profile, error: profileError } = await query.maybeSingle();

        if (profileError || !profile) {
          throw new Error('Failed to resolve profile after updating password.');
        }

        const loggedUser: User = {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          name: profile.name || '',
          bio: profile.bio || '',
          avatar: profile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.username}`,
          color: profile.color || '#C4B99D',
          isPrivate: profile.is_private || false,
          isAnonymousMode: profile.is_anonymous_mode || false,
          avatarConfig: profile.avatar_config || null,
          followers: [],
          following: []
        };

        alert('🎉 Password updated successfully! Logging you in.');
        onLoginSuccess(loggedUser);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to reset password.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Database backend is not connected.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-transparent border border-stone-800 backdrop-blur-xl rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative"
        >
          <div className="flex justify-between items-center border-b border-stone-800/80 pb-4">
            <div className="flex items-center gap-2.5 text-purple-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-extrabold text-stone-100">
                {forgotStep === 'request' && 'Account Recovery'}
                {forgotStep === 'verify' && 'Verify Security Code'}
                {forgotStep === 'reset' && 'Create New Password'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-transparent border border-rose-500/60 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotStep === 'request' && (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                Enter your username or email address below. We will transmit a security verification code to your registered email.
              </p>
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full bg-transparent border border-stone-700/80 hover:border-stone-500 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-transparent hover:bg-purple-950/20 border border-purple-500/70 hover:border-purple-400 text-purple-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Code</span>}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {forgotStep === 'verify' && (
            <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
              <p className="text-xs text-stone-400 leading-relaxed">
                We sent a security verification code to <strong className="text-stone-200">{forgotResetEmail}</strong>.
              </p>
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  value={forgotOtpToken}
                  onChange={(e) => setForgotOtpToken(e.target.value)}
                  className="w-full bg-transparent border border-stone-700/80 hover:border-stone-500 focus:border-purple-500 rounded-xl px-4 py-3 text-center text-lg font-mono text-stone-100 tracking-widest focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep('request')}
                  className="text-xs text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-transparent hover:bg-purple-950/20 border border-purple-500/70 hover:border-purple-400 text-purple-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Continue</span>}
                </button>
              </div>
            </form>
          )}

          {forgotStep === 'reset' && (
            <form onSubmit={handleForgotPasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full bg-transparent border border-stone-700/80 hover:border-stone-500 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    className="w-full bg-transparent border border-stone-700/80 hover:border-stone-500 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-transparent hover:bg-purple-950/20 border border-purple-500/70 hover:border-purple-400 text-purple-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password & Log In</span>}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

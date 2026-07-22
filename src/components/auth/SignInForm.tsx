import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { User } from '../../types';

interface SignInFormProps {
  onLoginSuccess: (user: User) => void;
  onOpenForgotPassword: () => void;
  onSwitchToSignUp: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onLoginSuccess,
  onOpenForgotPassword,
  onSwitchToSignUp
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        let authEmail = identifier.trim();

        if (!authEmail.includes('@')) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', authEmail.toLowerCase())
            .maybeSingle();

          if (profileErr || !profile || !profile.email) {
            throw new Error('Invalid username or password.');
          }
          authEmail = profile.email;
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password
        });

        if (authError) {
          if (authError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid username/email or password.');
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error('Failed to retrieve user session.');
        }

        const { data: profile, error: fetchErr } = await supabase
          .from('profiles')
          .select('id, username, email, name, bio, avatar, color, is_private, is_anonymous_mode, avatar_config')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (fetchErr || !profile) {
          throw new Error('Failed to fetch user profile.');
        }

        const userObj: User = {
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

        onLoginSuccess(userObj);
      } else {
        throw new Error('Database backend is not connected.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      {error && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/60 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Username or Email Input */}
      <div>
        <label className="block text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase mb-2">
          USERNAME OR EMAIL
        </label>
        <div className="relative">
          <UserIcon className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full bg-[#f0f4f9] text-stone-900 font-medium text-sm rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all"
          />
        </div>
      </div>

      {/* Password Input */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase">
            PASSWORD
          </label>
          <button
            type="button"
            onClick={onOpenForgotPassword}
            className="text-[10px] font-bold text-[#C4B99D] tracking-[0.25em] uppercase hover:underline transition-all cursor-pointer"
          >
            FORGOT PASSWORD?
          </button>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
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

      {/* SIGN IN -> Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-[#C4B99D] hover:bg-[#d4c9ad] text-stone-950 font-bold text-xs uppercase tracking-[0.25em] rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C4B99D]/20 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-3"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>SIGN IN</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { User } from '../../types';

interface SignUpFormProps {
  onRegisterUser: (user: User) => void;
  googleSignupSession?: { id: string; email: string; name: string } | null;
  onSwitchToSignIn: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onRegisterUser,
  googleSignupSession,
  onSwitchToSignIn
}) => {
  const [email, setEmail] = useState(googleSignupSession?.email || '');
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
    }
    if (googleSignupSession?.name) {
      setName(googleSignupSession.name);
    }
  }, [googleSignupSession]);

  useEffect(() => {
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
  }, [username]);

  const handleSignUp = async (e: React.FormEvent) => {
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

    try {
      if (isSupabaseConfigured && supabase) {
        let authUserId = googleSignupSession?.id || '';

        if (!googleSignupSession) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
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

        const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanUsername}`;

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUserId,
            username: cleanUsername,
            email: email.trim(),
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
          email: email.trim(),
          name: name.trim() || cleanUsername,
          bio: 'Hey there! I am using Be-Live ✨',
          avatar: defaultAvatar,
          color: '#C4B99D',
          isPrivate: false,
          isAnonymousMode: false,
          followers: [],
          following: []
        };

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
    <form onSubmit={handleSignUp} className="space-y-4">
      {error && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-500/60 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

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
            disabled={!!googleSignupSession}
            className="w-full bg-[#f0f4f9] text-stone-900 font-medium text-sm rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#C4B99D] shadow-inner transition-all disabled:opacity-60"
          />
        </div>
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
  );
};

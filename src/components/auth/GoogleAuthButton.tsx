import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface GoogleAuthButtonProps {
  googleSignupSession?: { id: string; email: string; name: string } | null;
  onClearGoogleSignupSession?: () => void;
  onGoogleSignIn: () => void;
  isLoading?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  googleSignupSession,
  onClearGoogleSignupSession,
  onGoogleSignIn,
  isLoading = false
}) => {
  if (googleSignupSession) {
    return (
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold block text-white text-xs">Completing Google Account Setup</span>
            <span className="text-[11px] text-amber-300 font-mono">{googleSignupSession.email}</span>
          </div>
        </div>
        {onClearGoogleSignupSession && (
          <button
            type="button"
            onClick={onClearGoogleSignupSession}
            className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-amber-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onGoogleSignIn}
      disabled={isLoading}
      className="w-full py-4 bg-transparent border border-stone-600 hover:border-stone-400 text-stone-100 font-bold text-xs uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] disabled:opacity-50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#EA4335"
          d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
        />
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
        />
        <path
          fill="#FBBC05"
          d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
        />
        <path
          fill="#34A853"
          d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
        />
      </svg>
      <span>CONTINUE WITH GOOGLE</span>
    </button>
  );
};

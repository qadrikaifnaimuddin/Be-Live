import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Mic, Palette } from 'lucide-react';
import { User } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import LoungeInteractive3D from '../LoungeInteractive3D';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { GoogleAuthButton } from './GoogleAuthButton';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onRegisterUser: (user: User) => void;
  googleSignupSession?: { id: string; email: string; name: string } | null;
  onClearGoogleSignupSession?: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onRegisterUser,
  googleSignupSession,
  onClearGoogleSignupSession
}: LoginScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(googleSignupSession ? 'signup' : 'signin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (googleSignupSession) {
      setMode('signup');
    }
  }, [googleSignupSession]);

  const handleGoogleSignIn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      alert('Supabase is not configured yet. Please check your environment variables.');
      return;
    }

    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Google Sign-In Error: ' + (err.message || err));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070707] text-stone-100 flex items-center justify-center p-6 md:p-12 overflow-hidden selection:bg-[#C4B99D] selection:text-stone-950">
      
      {/* Container Grid Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center max-w-6xl w-full mx-auto">
        
        {/* LEFT COLUMN: Interactive 3D Sphere & Title */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
            
            {/* 3D Lounge Mesh */}
            <div className="w-full h-full">
              <LoungeInteractive3D />
            </div>

            {/* Centered BE LIVE Typography inside 3D Sphere */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-[0.35em] text-[#C4B99D] uppercase font-light drop-shadow-[0_0_20px_rgba(196,185,157,0.4)] pl-3">
                BE LIVE
              </h1>
            </div>
          </div>

          {/* Subtitle Section at Bottom Left */}
          <div className="space-y-2 max-w-sm">
            <h3 className="text-sm font-serif tracking-[0.25em] text-[#C4B99D] uppercase font-bold">
              ENTER THE LOUNGE
            </h3>
            <p className="text-xs text-stone-400 font-light leading-relaxed">
              Interact with the geometric digital twin nodes. Move your cursor to rotate and distort the structure.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Auth Form & Floating Feature Badges */}
        <div className="relative w-full max-w-md mx-auto">
          
          {/* Top-Left Glowing Camera Badge */}
          <div className="absolute -top-7 -left-5 p-3.5 rounded-2xl border border-rose-500/50 bg-rose-950/20 text-rose-400 shadow-lg shadow-rose-500/20 backdrop-blur-md hidden sm:flex items-center justify-center z-20">
            <Camera className="w-5 h-5" />
          </div>

          {/* Center-Right Glowing Palette Badge */}
          <div className="absolute top-1/2 -right-7 -translate-y-1/2 p-3.5 rounded-2xl border border-amber-500/50 bg-amber-950/20 text-amber-400 shadow-lg shadow-amber-500/20 backdrop-blur-md hidden sm:flex items-center justify-center z-20">
            <Palette className="w-5 h-5" />
          </div>

          {/* Bottom-Right Glowing Microphone Badge */}
          <div className="absolute -bottom-6 -right-5 p-3.5 rounded-2xl border border-cyan-500/50 bg-cyan-950/20 text-cyan-400 shadow-lg shadow-cyan-500/20 backdrop-blur-md hidden sm:flex items-center justify-center z-20">
            <Mic className="w-5 h-5" />
          </div>

          {/* Main Auth Form Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5 relative z-10"
          >
            {/* Active Form (Sign In or Sign Up) */}
            {mode === 'signin' ? (
              <div className="space-y-5">
                <SignInForm
                  onLoginSuccess={onLoginSuccess}
                  onOpenForgotPassword={() => setShowForgotPassword(true)}
                  onSwitchToSignUp={() => setMode('signup')}
                />

                {/* Google Auth Button below SIGN IN */}
                <GoogleAuthButton
                  googleSignupSession={googleSignupSession}
                  onClearGoogleSignupSession={onClearGoogleSignupSession}
                  onGoogleSignIn={handleGoogleSignIn}
                  isLoading={googleLoading}
                />

                {/* Switch Link */}
                <div className="text-center pt-2">
                  <p className="text-xs text-stone-400 font-medium">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-[#C4B99D] font-bold underline underline-offset-4 hover:text-white transition-colors cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <SignUpForm
                  onRegisterUser={onRegisterUser}
                  googleSignupSession={googleSignupSession}
                  onSwitchToSignIn={() => setMode('signin')}
                />

                {/* Google Auth Button below SIGN UP */}
                <GoogleAuthButton
                  googleSignupSession={googleSignupSession}
                  onClearGoogleSignupSession={onClearGoogleSignupSession}
                  onGoogleSignIn={handleGoogleSignIn}
                  isLoading={googleLoading}
                />

                {/* Switch Link */}
                <div className="text-center pt-2">
                  <p className="text-xs text-stone-400 font-medium">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-[#C4B99D] font-bold underline underline-offset-4 hover:text-white transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onLoginSuccess={onLoginSuccess}
      />
    </div>
  );
}

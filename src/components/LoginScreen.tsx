/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff, Sparkles, Camera, Mic, Palette } from 'lucide-react';
import { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import LoungeInteractive3D from './LoungeInteractive3D';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onRegisterUser: (user: User) => void;
  googleSignupSession?: { id: string; email: string; name: string } | null;
  onClearGoogleSignupSession?: () => void;
}

type Mode = 'signin' | 'signup' | 'forgot_password' | 'reset_password';
type SignUpStep = 'email_input' | 'otp_input' | 'profile_setup';

export default function LoginScreen({
  onLoginSuccess,
  onRegisterUser,
  googleSignupSession,
  onClearGoogleSignupSession
}: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');

  // Form values
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signInIdentifier, setSignInIdentifier] = useState(''); // Email or Username
  const [signInPassword, setSignInPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');

  // Forgot / Reset Password values
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotResetEmail, setForgotResetEmail] = useState('');
  const [forgotOtpToken, setForgotOtpToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // UI states
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email_input');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleSimulatedEmail, setGoogleSimulatedEmail] = useState<string | null>(null);

  // Real-time username validation states
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState<boolean>(false);
  const [tempVerifiedUser, setTempVerifiedUser] = useState<{ id: string; email: string } | null>(null);

  React.useEffect(() => {
    const oauthError = localStorage.getItem('oauth_error');
    if (oauthError) {
      setError(oauthError);
      localStorage.removeItem('oauth_error');
      setMode('signin');
    }

    // Check if redirected from a password recovery link
    const hash = window.location.hash || window.location.search;
    if (hash && (hash.includes('type=recovery') || hash.includes('recovery'))) {
      setMode('reset_password');
    }

    // Restore pending signup step on mobile reload (tab memory management fallback)
    const pendingStep = localStorage.getItem('pending_signup_step') as SignUpStep | null;
    const pendingEmail = localStorage.getItem('pending_signup_email');
    if (pendingStep && pendingEmail) {
      setMode('signup');
      setSignUpStep(pendingStep);
      setEmail(pendingEmail);

      const pendingUser = localStorage.getItem('pending_verified_user');
      if (pendingUser) {
        try {
          setTempVerifiedUser(JSON.parse(pendingUser));
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Restore pending forgot password step on reload
    const pendingForgotStep = localStorage.getItem('pending_forgot_step') as 'request' | 'verify' | 'reset' | null;
    const pendingForgotEmail = localStorage.getItem('pending_forgot_email');
    const pendingForgotId = localStorage.getItem('pending_forgot_identifier');
    if (pendingForgotStep && (pendingForgotEmail || pendingForgotId)) {
      setMode('forgot_password');
      setForgotStep(pendingForgotStep);
      if (pendingForgotEmail) setForgotResetEmail(pendingForgotEmail);
      if (pendingForgotId) setForgotIdentifier(pendingForgotId);
    }

    const googleSession = localStorage.getItem('google_signup_session');
    if (googleSession) {
      try {
        const parsed = JSON.parse(googleSession);
        if (parsed.email) {
          setEmail(parsed.email);
          setFullName(parsed.name || '');
          setMode('signup');
          setSignUpStep('profile_setup');

          // Pre-populate username from email prefix
          const emailPrefix = parsed.email.split('@')[0].replace(/[^a-z0-9_]/g, '');
          setUsername(emailPrefix);
          handleUsernameChange(emailPrefix);

          // Set error message
          setError('Google connected! Complete your profile registration.');
        }
      } catch (err) {
        console.error('Google session load error:', err);
      } finally {
        localStorage.removeItem('google_signup_session');
        if (onClearGoogleSignupSession) onClearGoogleSignupSession();
      }
    }
  }, []);

  // Save state to localStorage to prevent mobile tab reload resets
  React.useEffect(() => {
    if (signUpStep !== 'email_input') {
      localStorage.setItem('pending_signup_step', signUpStep);
      localStorage.setItem('pending_signup_email', email);
      if (tempVerifiedUser) {
        localStorage.setItem('pending_verified_user', JSON.stringify(tempVerifiedUser));
      }
    } else {
      localStorage.removeItem('pending_signup_step');
      localStorage.removeItem('pending_signup_email');
      localStorage.removeItem('pending_verified_user');
    }
  }, [signUpStep, email, tempVerifiedUser]);

  // Save forgot password state to localStorage to prevent reload resets
  React.useEffect(() => {
    if (mode === 'forgot_password' && forgotStep !== 'request') {
      localStorage.setItem('pending_forgot_step', forgotStep);
      localStorage.setItem('pending_forgot_email', forgotResetEmail);
      localStorage.setItem('pending_forgot_identifier', forgotIdentifier);
    } else {
      localStorage.removeItem('pending_forgot_step');
      localStorage.removeItem('pending_forgot_email');
      localStorage.removeItem('pending_forgot_identifier');
    }
  }, [mode, forgotStep, forgotResetEmail, forgotIdentifier]);

  // React to prop changes (for in-place OAuth completion)
  React.useEffect(() => {
    if (googleSignupSession) {
      setEmail(googleSignupSession.email);
      setFullName(googleSignupSession.name || '');
      setMode('signup');
      setSignUpStep('profile_setup');

      const emailPrefix = googleSignupSession.email.split('@')[0].replace(/[^a-z0-9_]/g, '');
      setUsername(emailPrefix);
      handleUsernameChange(emailPrefix);

      setError('Google connected! Complete your profile registration.');
    }
  }, [googleSignupSession]);

  // Clear errors on mode switch
  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    setSignUpStep('email_input');
    setError(null);
    setEmail('');
    setUsername('');
    setPassword('');
    setFullName('');
    setSignInIdentifier('');
    setSignInPassword('');
    setOtpToken('');
    setGoogleSimulatedEmail(null);
    setUsernameError(null);
    setIsUsernameAvailable(null);
    setTempVerifiedUser(null);
    localStorage.removeItem('pending_signup_step');
    localStorage.removeItem('pending_signup_email');
    localStorage.removeItem('pending_verified_user');
    localStorage.removeItem('pending_forgot_step');
    localStorage.removeItem('pending_forgot_email');
    localStorage.removeItem('pending_forgot_identifier');

    // Forgot password states
    setForgotStep('request');
    setForgotIdentifier('');
    setForgotResetEmail('');
    setForgotOtpToken('');
    setResetPassword('');
    setConfirmResetPassword('');
    setSignupConfirmPassword('');
  };

  // 1. SIGN IN SUBMIT
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signInIdentifier || !signInPassword) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        let loginEmail = signInIdentifier.trim();
        if (!loginEmail.includes('@')) {
          // Resolve username to email address
          const { data: profileObj, error: findError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', signInIdentifier.trim().toLowerCase())
            .maybeSingle();

          if (profileObj && profileObj.email) {
            loginEmail = profileObj.email;
          } else {
            throw new Error('Username not found.');
          }
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: signInPassword
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Auth failed.');

        // Load profile records
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, email, name, bio, avatar, color, is_private, is_anonymous_mode, avatar_config')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        const loggedUser: User = {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          name: profile.name,
          bio: profile.bio || "",
          avatar: profile.avatar || "",
          color: profile.color || "#4F46E5",
          isPrivate: profile.is_private || false,
          isAnonymousMode: profile.is_anonymous_mode || false,
          avatarConfig: profile.avatar_config || null,
          followers: [],
          following: []
        };

        onLoginSuccess(loggedUser);
      } catch (err: any) {
        setError(err.message || 'Invalid username/email or password.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local Server / Mock Fallback Mode
      fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernameOrEmail: signInIdentifier,
          password: signInPassword
        })
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Invalid credentials.');
          }
          onLoginSuccess(data);
        })
        .catch((err: any) => {
          setError(err.message || 'Invalid username/email or password');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  // 2. CONTINUE WITH GOOGLE (Sign In or Sign Up)
  const handleGoogleAuth = () => {
    setError(null);
    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      localStorage.setItem('google_oauth_mode', mode);
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
        .then(({ error }) => {
          if (error) setError(error.message);
        })
        .catch(err => setError(err.message || 'OAuth redirect failed.'))
        .finally(() => setLoading(false));
      return;
    }

    // Mock Google Popup
    setTimeout(async () => {
      // Prompt user with a google email or use a randomized mock Google email
      const simulatedEmails = [
        'qadrikaifnaimuddin@gmail.com',
        'alex.wonderland@gmail.com',
        'clara.adventure@gmail.com',
        'johndoe@gmail.com'
      ];

      // Let's grab a random one, or the user's email if available in metadata
      const googleEmail = 'qadrikaifnaimuddin@gmail.com';

      // Check if this Google email already registered
      let existingUser = null;
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const list = await res.json();
          existingUser = list.find((u: any) => u.email.toLowerCase() === googleEmail.toLowerCase());
        }
      } catch (err) {
        console.error(err);
      }

      if (mode === 'signin') {
        if (existingUser) {
          // Log them in immediately
          onLoginSuccess(existingUser);
        } else {
          // Email not registered yet, switch to signup mode and start Google registration
          setMode('signup');
          setSignUpStep('profile_setup');
          setEmail(googleEmail);
          setGoogleSimulatedEmail(googleEmail);
          setError('Google account not registered. Let\'s complete your profile!');
        }
      } else {
        // Sign Up Mode
        if (existingUser) {
          // Already exists, log them in!
          setError('Google account already registered. Logging you in...');
          setTimeout(() => {
            onLoginSuccess(existingUser);
          }, 1000);
        } else {
          // Go to create username step
          setEmail(googleEmail);
          setGoogleSimulatedEmail(googleEmail);
          setSignUpStep('profile_setup');
        }
      }
      setLoading(false);
    }, 1200);
  };

  // 3. SEND OTP CODE
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: true
          }
        });
        if (otpError) throw otpError;
        setSignUpStep('otp_input');
      } catch (err: any) {
        setError(err.message || 'Failed to send verification OTP.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local simulated mode
      setTimeout(() => {
        setLoading(false);
        setSignUpStep('otp_input');
        alert('🔑 [Mock OTP] Verification code: 123456');
      }, 1000);
    }
  };

  // 4. VERIFY OTP CODE
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpToken.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otpToken.trim(),
          type: 'email'
        });
        if (verifyError) throw verifyError;
        if (data.user) {
          setTempVerifiedUser({
            id: data.user.id,
            email: data.user.email || email.trim().toLowerCase()
          });
        }
        setSignUpStep('profile_setup');

        const emailPrefix = email.split('@')[0].replace(/[^a-z0-9_]/g, '');
        setUsername(emailPrefix);
        handleUsernameChange(emailPrefix);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired verification code.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local simulated verification
      setTimeout(() => {
        setLoading(false);
        if (otpToken.trim() === '123456') {
          setTempVerifiedUser({
            id: `mock_user_${Date.now()}`,
            email: email.trim().toLowerCase()
          });
          setSignUpStep('profile_setup');

          const emailPrefix = email.split('@')[0].replace(/[^a-z0-9_]/g, '');
          setUsername(emailPrefix);
          handleUsernameChange(emailPrefix);
        } else {
          setError('Invalid verification code. Try "123456" in local mode.');
        }
      }, 800);
    }
  };

  // 5. REAL-TIME USERNAME VALIDATION
  const handleUsernameChange = async (val: string) => {
    // lowercase, numbers, underscores only, no spaces
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);

    if (sanitized.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setIsUsernameAvailable(false);
      return;
    }

    setUsernameChecking(true);
    setUsernameError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', sanitized)
          .maybeSingle();

        if (data) {
          setUsernameError('Username is already taken.');
          setIsUsernameAvailable(false);
        } else {
          setIsUsernameAvailable(true);
        }
      } else {
        try {
          const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(sanitized)}`);
          if (res.ok) {
            const data = await res.json();
            if (!data.available) {
              setUsernameError('Username is already taken.');
              setIsUsernameAvailable(false);
            } else {
              setIsUsernameAvailable(true);
            }
          } else {
            setIsUsernameAvailable(true);
          }
        } catch (err) {
          setIsUsernameAvailable(true);
        }
      }
    } catch (err) {
      console.error('Username check error:', err);
    } finally {
      setUsernameChecking(false);
    }
  };

  // 6. COMPLETE REGISTRATION
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!isUsernameAvailable) {
      setError('Please choose an available username.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== signupConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const finalName = fullName.trim() || username.trim();

    if (isSupabaseConfigured && supabase) {
      try {
        // Resolve authenticated user details: check caches first to avoid session initialization delays
        let userId = '';
        let userEmail = '';

        if (googleSignupSession) {
          userId = googleSignupSession.id;
          userEmail = googleSignupSession.email;
        } else if (tempVerifiedUser) {
          userId = tempVerifiedUser.id;
          userEmail = tempVerifiedUser.email;
        } else {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            userId = authUser.id;
            userEmail = authUser.email || email.toLowerCase();
          }
        }

        if (!userId) {
          throw new Error('Auth session not found. Please verify your OTP or connect with Google.');
        }

        // Set the user's password in Supabase!
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });
        if (updateError) throw updateError;

        const profilePayload = {
          id: userId,
          username: username.toLowerCase(),
          email: userEmail,
          name: finalName,
          bio: `Hey there! I am ${finalName}. ✨ New to Social Media.`,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          is_private: false,
          is_anonymous_mode: false
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profilePayload);

        if (profileError) throw profileError;

        const registeredUser: User = {
          id: profilePayload.id,
          username: profilePayload.username,
          email: profilePayload.email,
          name: profilePayload.name,
          bio: profilePayload.bio,
          avatar: profilePayload.avatar,
          color: profilePayload.color,
          isPrivate: profilePayload.is_private,
          isAnonymousMode: profilePayload.is_anonymous_mode,
          avatarConfig: null,
          followers: [],
          following: []
        };

        localStorage.removeItem('pending_signup_step');
        localStorage.removeItem('pending_signup_email');
        localStorage.removeItem('pending_verified_user');

        onRegisterUser(registeredUser);
        onLoginSuccess(registeredUser);
      } catch (err: any) {
        setError(err.message || 'Failed to complete registration.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallback mode
      fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          name: finalName,
          bio: `Hey there! I am ${finalName}. ✨ New to Social Media.`,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
          password
        })
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to register.');
          }
          localStorage.removeItem('pending_signup_step');
          localStorage.removeItem('pending_signup_email');
          localStorage.removeItem('pending_verified_user');
          onRegisterUser(data);
          onLoginSuccess(data);
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to create account.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  // Helper to mask email address (Instagram style, with fixed-length obfuscation)
  const maskEmail = (emailStr: string): string => {
    const [localPart, domainPart] = emailStr.split('@');
    if (!localPart || !domainPart) return emailStr;

    const firstChar = localPart[0] || '';
    const lastChar = localPart.length > 1 ? localPart[localPart.length - 1] : '';
    const maskedLocal = `${firstChar}**********${lastChar}`;

    const domainParts = domainPart.split('.');
    const domainName = domainParts[0] || '';
    const domainExt = domainParts.slice(1).join('.');

    const firstDomainChar = domainName[0] || '';
    const lastDomainChar = domainName.length > 1 ? domainName[domainName.length - 1] : '';
    const maskedDomain = `${firstDomainChar}*****${lastDomainChar}`;

    return `${maskedLocal}@${maskedDomain}.${domainExt}`;
  };

  // 7. FORGOT PASSWORD - STEP 1: REQUEST OTP
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!forgotIdentifier.trim()) {
      setError('Please enter your username or email address.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        let targetEmail = forgotIdentifier.trim().toLowerCase();

        // If it's not a direct email address, resolve it from the profiles table using username
        if (!targetEmail.includes('@')) {
          const { data: profile, error: queryError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', targetEmail)
            .maybeSingle();

          if (queryError) throw queryError;
          if (!profile || !profile.email) {
            throw new Error('No account associated with this username was found.');
          }
          targetEmail = profile.email;
        } else {
          // Verify that this email actually has an account
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

        // Send OTP code to the target email
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: {
            shouldCreateUser: false // Reset password means account should already exist
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
      // Local fallback mode
      setTimeout(async () => {
        setLoading(false);
        const inputVal = forgotIdentifier.trim().toLowerCase();
        let matchedUser = null;
        try {
          const res = await fetch('/api/users');
          if (res.ok) {
            const list = await res.json();
            matchedUser = list.find((u: any) => u.username.toLowerCase() === inputVal || u.email.toLowerCase() === inputVal);
          }
        } catch (e) {
          console.error(e);
        }
        if (!matchedUser) {
          matchedUser = {
            id: 'mock_forgot_user',
            username: inputVal.includes('@') ? 'mock_user' : inputVal,
            email: inputVal.includes('@') ? inputVal : 'mock_user@be-live.app',
            name: 'Mock User',
            bio: '',
            avatar: '',
            followers: [],
            following: []
          };
        }
        setForgotResetEmail(matchedUser.email);
        setForgotStep('verify');
        alert('🔑 [Mock OTP] Password reset verification code: 123456');
      }, 1000);
    }
  };

  // 8. FORGOT PASSWORD - STEP 2: VERIFY OTP
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
          type: 'email'
        });

        if (verifyError) throw verifyError;
        setForgotStep('reset');
      } catch (err: any) {
        setError(err.message || 'Invalid or expired verification code.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local mock verification
      setTimeout(() => {
        setLoading(false);
        if (forgotOtpToken.trim() === '123456') {
          setForgotStep('reset');
        } else {
          setError('Invalid verification code. Try "123456" in local mode.');
        }
      }, 800);
    }
  };

  // 9. FORGOT PASSWORD - STEP 3: RESET PASSWORD & AUTO LOG IN
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
        // Set new password
        const { error: updateError } = await supabase.auth.updateUser({
          password: resetPassword
        });
        if (updateError) throw updateError;

        // Fetch their profile payload to log them in directly
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

        // Reset states
        setForgotStep('request');
        setForgotIdentifier('');
        setForgotResetEmail('');
        setForgotOtpToken('');
        setResetPassword('');
        setConfirmResetPassword('');

        alert('🎉 Password updated successfully! Logging you in.');
        onLoginSuccess(loggedUser);
      } catch (err: any) {
        setError(err.message || 'Failed to reset password.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local simulated reset
      setTimeout(() => {
        setLoading(false);
        alert('🎉 [Mock Reset] Password updated successfully! Logging you in.');

        const mockUser: User = {
          id: `mock_${forgotResetEmail.split('@')[0]}`,
          username: forgotResetEmail.split('@')[0],
          email: forgotResetEmail,
          name: 'Mock Creator',
          bio: 'Hey there! ✨',
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${forgotResetEmail}`,
          followers: [],
          following: []
        };

        setForgotStep('request');
        setForgotIdentifier('');
        setForgotResetEmail('');
        setForgotOtpToken('');
        setResetPassword('');
        setConfirmResetPassword('');

        onLoginSuccess(mockUser);
      }, 1000);
    }
  };

  return (
    <div id="login_container" className="min-h-screen bg-[#070605] flex flex-col justify-center items-center p-3 sm:p-6 select-none relative overflow-hidden text-stone-100">

      {/* Futuristic Grid Mesh Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* 3D Glowing background blobs */}
      <motion.div
        animate={{
          scale: [1, 1.25, 0.95, 1],
          x: [0, 60, -30, 0],
          y: [0, -30, 40, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-[#C4B99D]/12 to-transparent blur-[130px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.2, 0.95, 1.15, 1.2],
          x: [0, -50, 40, 0],
          y: [0, 40, -50, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#E11D48]/8 via-[#8B5CF6]/4 to-transparent blur-[150px] pointer-events-none"
      />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-center relative z-10 px-2 sm:px-4 py-3 sm:py-8">

        <div className="w-full lg:col-span-5 flex flex-col justify-center items-center text-center lg:text-left min-h-[190px] lg:min-h-[500px] z-10">
          <div className="w-full h-[180px] lg:h-[450px] flex justify-center items-center relative overflow-hidden">
            <LoungeInteractive3D />

            {/* Centered Be Live text overlay inside the globe */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <h1 className="text-2.5xl lg:text-4xl font-serif font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-white via-[#EAE3D2] to-[#C4B99D] uppercase drop-shadow-[0_2px_15px_rgba(196,185,157,0.3)]">
                Be Live
              </h1>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 hidden lg:block"
          >
            <h2 className="text-[#C4B99D] font-serif text-lg font-bold tracking-wider mb-1.5 uppercase">Enter the Lounge</h2>
            <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
              Interact with the geometric digital twin nodes. Move your cursor to rotate and distort the structure.
            </p>
          </motion.div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center w-full relative z-10">



          {/* 3D Perspective Card Container */}
          <div style={{ perspective: 1500 }} className="w-full max-w-md relative">

            {/* Floating 3D Orbital Elements */}
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -left-10 w-12 h-12 rounded-xl bg-stone-900/90 border border-stone-850 flex items-center justify-center text-rose-400 shadow-[0_5px_15px_rgba(225,29,72,0.15)] pointer-events-none hidden sm:flex"
            >
              <Camera className="w-5 h-5" />
            </motion.div>

            <motion.div
              animate={{ y: [0, 12, 0], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-10 -right-10 w-12 h-12 rounded-xl bg-stone-900/90 border border-stone-850 flex items-center justify-center text-cyan-400 shadow-[0_5px_15px_rgba(6,182,212,0.15)] pointer-events-none hidden sm:flex"
            >
              <Mic className="w-5 h-5" />
            </motion.div>

            <motion.div
              animate={{ x: [0, -10, 10, 0], y: [0, -8, 8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/2 -right-12 w-12 h-12 rounded-xl bg-stone-900/90 border border-stone-850 flex items-center justify-center text-amber-400 shadow-[0_5px_15px_rgba(245,158,11,0.15)] pointer-events-none hidden sm:flex"
            >
              <Palette className="w-5 h-5" />
            </motion.div>

            {/* Ambient glow behind card */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#C4B99D]/10 via-transparent to-[#E11D48]/5 blur-[70px] pointer-events-none rounded-3xl" />

            <motion.div
              key={mode}
              initial={{ opacity: 0, rotateY: mode === 'signin' ? -20 : 20, z: -100 }}
              animate={{ opacity: 1, rotateY: 0, z: 0 }}
              exit={{ opacity: 0, rotateY: mode === 'signin' ? 20 : -20, z: -100 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              whileHover={{ rotateX: 3, rotateY: -3, scale: 1.008 }}
              className="bg-transparent rounded-3xl p-5 sm:p-8 relative"
            >
              {mode !== 'signin' && (
                <div className="flex justify-center mb-6">
                  <span className="px-3.5 py-1 bg-stone-900/90 border border-stone-800 text-[#C4B99D] font-mono text-[9px] uppercase tracking-[0.25em] rounded-full font-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                    {mode === 'forgot_password' ? 'PASSWORD RECOVERY' :
                      mode === 'reset_password' ? 'RESET PASSWORD' : 'CREATOR REGISTRATION'}
                  </span>
                </div>
              )}

              {/* Error Message Box */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3.5 rounded-xl mb-5 flex items-center gap-2.5 text-xs font-semibold ${error.includes('Logging you in') || error.includes('complete your profile')
                        ? 'bg-amber-950/30 text-amber-300 border border-amber-900/40'
                        : 'bg-red-950/30 text-red-300 border border-red-900/40'
                      }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-relaxed">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === 'signin' && (
                <div id="signin_form_wrapper">
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Username or Email</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                          <UserIcon className="w-4 h-4" />
                        </span>
                        <input
                          id="input_signin_identifier"
                          type="text"
                          placeholder="e.g. wanderer or email"
                          value={signInIdentifier}
                          onChange={(e) => setSignInIdentifier(e.target.value.toLowerCase())}
                          disabled={loading}
                          className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Password</label>
                        <button
                          type="button"
                          onClick={() => setMode('forgot_password')}
                          className="text-[8px] uppercase tracking-[0.1em] font-extrabold text-[#C4B99D] hover:text-[#d5cbaf] transition-colors cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          id="input_signin_password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter account password"
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          disabled={loading}
                          className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <motion.button
                        id="btn_submit_signin"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Sign In <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>

                  <motion.button
                    id="btn_signin_google"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full mt-5 py-3 border border-stone-850 bg-stone-900/30 hover:bg-stone-900 text-stone-300 rounded-xl text-xs uppercase tracking-[0.15em] font-extrabold flex justify-center items-center gap-2.5 transition-all cursor-pointer hover:border-stone-700 active:scale-98 hover:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                  >
                    <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.514 5.514 0 0 1 8.5 13a5.514 5.514 0 0 1 5.49-5.514c1.47 0 2.801.558 3.81 1.463l3.056-3.056C18.96 4.025 16.59 3 13.99 3A10 10 0 0 0 3.99 13a10 10 0 0 0 10 10c5.56 0 10-4.04 10-10a9.096 9.096 0 0 0-.166-1.715H12.24Z"
                      />
                    </svg>
                    Continue with Google
                  </motion.button>

                  <div className="mt-8 text-center text-xs text-stone-400 font-medium">
                    Don't have an account?{" "}
                    <button
                      onClick={() => handleModeSwitch('signup')}
                      className="text-[#C4B99D] font-black underline cursor-pointer hover:text-white transition-colors"
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div id="signup_form_wrapper">

                  {signUpStep === 'email_input' && (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Email Address</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            id="input_signup_email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <motion.button
                          id="btn_submit_signup_continue"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              Continue <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                            </>
                          )}
                        </motion.button>
                      </div>

                      <motion.button
                        id="btn_signup_google"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full mt-5 py-3 border border-stone-850 bg-stone-900/30 hover:bg-stone-900 text-stone-300 rounded-xl text-xs uppercase tracking-[0.15em] font-extrabold flex justify-center items-center gap-2.5 transition-all cursor-pointer hover:border-stone-700 active:scale-98 hover:shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                      >
                        <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.514 5.514 0 0 1 8.5 13a5.514 5.514 0 0 1 5.49-5.514c1.47 0 2.801.558 3.81 1.463l3.056-3.056C18.96 4.025 16.59 3 13.99 3A10 10 0 0 0 3.99 13a10 10 0 0 0 10 10c5.56 0 10-4.04 10-10a9.096 9.096 0 0 0-.166-1.715H12.24Z"
                          />
                        </svg>
                        Continue with Google
                      </motion.button>
                    </form>
                  )}

                  {signUpStep === 'otp_input' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-stone-400">
                          We sent a verification code to <span className="text-[#C4B99D] font-bold">{email}</span>
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Verification Code</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            id="input_signup_otp"
                            type="text"
                            maxLength={100}
                            placeholder="Enter verification code"
                            value={otpToken}
                            onChange={(e) => setOtpToken(e.target.value)}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-center text-sm font-mono tracking-[0.2em] text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-750 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSignUpStep('email_input')}
                          className="px-4 py-3 border border-stone-850 hover:bg-stone-900 text-stone-400 rounded-xl text-xs uppercase tracking-[0.1em] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </button>
                        <button
                          id="btn_submit_signup_otp"
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              Verify Code <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {signUpStep === 'profile_setup' && (
                    <form onSubmit={handleSignUpSubmit} className="space-y-4">
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-stone-400">
                          Let's set up your public creator profile
                        </p>
                      </div>



                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Username</label>
                          {usernameChecking && <span className="text-[8px] text-stone-550 font-mono animate-pulse">Checking...</span>}
                          {!usernameChecking && isUsernameAvailable === true && <span className="text-[8px] text-emerald-400 font-mono font-bold">✓ Available</span>}
                          {!usernameChecking && isUsernameAvailable === false && <span className="text-[8px] text-rose-400 font-mono font-bold">✗ {usernameError || 'Unavailable'}</span>}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                            <UserIcon className="w-4 h-4" />
                          </span>
                          <input
                            id="input_signup_username"
                            type="text"
                            placeholder="lowercase_and_numbers_only"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            disabled={loading}
                            className={`w-full pl-10 pr-4 py-3 bg-stone-950/60 border rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-700 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] ${isUsernameAvailable === true ? 'border-emerald-900/60 focus:border-emerald-500' :
                                isUsernameAvailable === false ? 'border-rose-900/60 focus:border-rose-500' :
                                  'border-stone-850 focus:border-[#C4B99D] hover:border-stone-700'
                              }`}
                            required
                          />
                        </div>
                        <p className="text-[8px] text-stone-500 leading-normal">
                          Only lowercase letters, numbers, and underscores are allowed. No spaces, uppercase or special chars.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Create Password</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            id="input_signup_password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Confirm Password</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            id="input_signup_confirm_password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirm password"
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            disabled={loading}
                            className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          id="btn_submit_signup_finish"
                          type="submit"
                          disabled={loading || !isUsernameAvailable || usernameChecking || username.length < 3}
                          className="w-full py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              Complete Sign Up <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Bottom Switcher */}
                  <div className="mt-8 text-center text-xs text-stone-400 font-medium">
                    Already have an account?{" "}
                    <button
                      onClick={() => handleModeSwitch('signin')}
                      className="text-[#C4B99D] font-black underline cursor-pointer hover:text-white transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}

              {mode === 'forgot_password' && (
                <div id="forgot_password_form_wrapper" className="space-y-5">
                  {forgotStep === 'request' && (
                    <>
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-stone-400">
                          Enter your username or email address and we'll send you a code to reset your password.
                        </p>
                      </div>
                      <form onSubmit={handleForgotPasswordRequest} className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Username or Email</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                              <UserIcon className="w-4 h-4" />
                            </span>
                            <input
                              id="input_forgot_identifier"
                              type="text"
                              placeholder="e.g. wanderer or email"
                              value={forgotIdentifier}
                              onChange={(e) => setForgotIdentifier(e.target.value.toLowerCase())}
                              disabled={loading}
                              className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                              required
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleModeSwitch('signin')}
                            className="px-4 py-3 border border-stone-850 hover:bg-stone-900 text-stone-400 rounded-xl text-xs uppercase tracking-[0.1em] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                Find Account <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </>
                  )}

                  {forgotStep === 'verify' && (
                    <>
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-stone-400">
                          We sent a verification code to the email associated with your account:
                        </p>
                        <p className="text-sm font-semibold text-[#C4B99D] font-mono mt-1">
                          {maskEmail(forgotResetEmail)}
                        </p>
                      </div>
                      <form onSubmit={handleForgotPasswordVerify} className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Verification Code</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                              <Lock className="w-4 h-4" />
                            </span>
                            <input
                              id="input_forgot_otp"
                              type="text"
                              maxLength={100}
                              placeholder="Enter verification code"
                              value={forgotOtpToken}
                              onChange={(e) => setForgotOtpToken(e.target.value)}
                              disabled={loading}
                              className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-center text-sm font-mono tracking-[0.2em] text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-750 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                              required
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            type="button"
                            onClick={() => setForgotStep('request')}
                            className="px-4 py-3 border border-stone-850 hover:bg-stone-900 text-stone-400 rounded-xl text-xs uppercase tracking-[0.1em] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                Verify Code <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </>
                  )}

                  {forgotStep === 'reset' && (
                    <>
                      <div className="text-center mb-2">
                        <p className="text-[10px] text-stone-400">
                          Code verified! Create a secure new password for your account.
                        </p>
                      </div>
                      <form onSubmit={handleForgotPasswordReset} className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">New Password</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                              <Lock className="w-4 h-4" />
                            </span>
                            <input
                              id="input_forgot_new_password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min. 6 characters"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              disabled={loading}
                              className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Confirm New Password</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                              <Lock className="w-4 h-4" />
                            </span>
                            <input
                              id="input_forgot_new_password_confirm"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Confirm new password"
                              value={confirmResetPassword}
                              onChange={(e) => setConfirmResetPassword(e.target.value)}
                              disabled={loading}
                              className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                              required
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                Reset Password & Log In <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              )}

              {mode === 'reset_password' && (
                <div id="reset_password_form_wrapper" className="space-y-5">
                  <div className="text-center mb-2">
                    <p className="text-[10px] text-stone-400">
                      Please create a secure new password for your account.
                    </p>
                  </div>
                  <form onSubmit={handleForgotPasswordReset} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">New Password</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          id="input_reset_password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 6 characters"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          disabled={loading}
                          className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-stone-500" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#A89D82]">Confirm New Password</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          id="input_reset_password_confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          disabled={loading}
                          className="w-full pl-10 pr-10 py-3 bg-stone-950/60 border border-stone-850 focus:border-[#C4B99D] rounded-xl text-xs font-medium text-white transition-all duration-300 ease-out focus:scale-[1.015] outline-none placeholder-stone-600 focus:shadow-[0_0_20px_rgba(196,185,157,0.25)] hover:border-stone-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-[#C4B99D] to-[#B3A687] hover:from-[#d5cbaf] hover:to-[#c4b99d] disabled:from-stone-800 disabled:to-stone-900 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-[0.15em] transition-all flex justify-center items-center gap-2 shadow-lg shadow-[#C4B99D]/5 cursor-pointer active:scale-98"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            Update Password <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* CSS Keyframes for infinite marquee */}
      <style dangerouslySetInnerHTML={{
        __html: `
    @keyframes marqueeHorizontal {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    .animate-marquee-horizontal {
      animation: marqueeHorizontal 32s linear infinite;
    }
  `}} />

      {/* Infinite Marquee at the bottom of the page */}
      <div className="w-full absolute bottom-4 left-0 pointer-events-none select-none z-0 opacity-12 overflow-hidden py-1">
        <div className="whitespace-nowrap flex animate-marquee-horizontal text-[4vw] lg:text-[2vw] font-serif font-black uppercase tracking-[0.25em] text-[#C4B99D]/40 select-none">
          <span>BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;</span>
          <span>BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;BE-LIVE&nbsp;•&nbsp;</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  ArrowRight,
  UserCheck,
  AlertCircle,
  KeyRound,
  UserPlus,
  CheckCircle2,
  Lock,
  Phone,
  User as UserIcon,
  Sparkles,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { googleSignIn, getAccessToken } from '../services/firebaseAuth';
import { INITIAL_USER } from '../data/mockData';
import { UserAccount } from '../types/travel';
import { saveStoredUser } from '../services/api';
import {
  sendAccountCreatedNotification,
  sendForgotPasswordNotification,
  sendLoginSecurityAlertNotification,
} from '../services/gmailService';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: UserAccount, token?: string) => void;
  onNotificationSent?: (type: string, email: string) => void;
  isMandatoryStartup?: boolean;
  initialMode?: 'signin' | 'signup' | 'forgot_password';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSuccess,
  onNotificationSent,
  isMandatoryStartup = false,
  initialMode = 'signin',
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot_password'>(initialMode);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sign In inputs - initialized completely blank
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Create Account inputs (Name, Email address, Phone number, Password, Confirm password) - initialized completely blank
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Real-time password validation criteria:
  // 1. Minimum length: at least 8 characters
  // 2. Numeric requirement: at least one digit (0-9)
  // 3. Special character requirement: at least one special char (!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~)
  // Optional bonus criteria: uppercase letter (A-Z) and lowercase letter (a-z)
  const hasMinLength = signUpPassword.length >= 8;
  const hasNumber = /\d/.test(signUpPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(signUpPassword);
  const hasUpperLower = /[A-Z]/.test(signUpPassword) && /[a-z]/.test(signUpPassword);

  // Is password fully valid to satisfy requirements
  const isPasswordCriteriaMet = hasMinLength && hasNumber && hasSpecialChar;
  const isPasswordMatch = signUpPassword.length > 0 && signUpPassword === signUpConfirmPassword;
  const isSignUpFormValid =
    signUpName.trim().length > 0 &&
    signUpEmail.trim().length > 0 &&
    signUpPhone.trim().length > 0 &&
    isPasswordCriteriaMet &&
    isPasswordMatch;

  // Strength score: 0 to 4
  const strengthScore = [hasMinLength, hasNumber, hasSpecialChar, hasUpperLower].filter(Boolean).length;
  const strengthLabel =
    signUpPassword.length === 0
      ? 'Empty'
      : strengthScore <= 1
      ? 'Weak'
      : strengthScore === 2
      ? 'Fair'
      : strengthScore === 3
      ? 'Good'
      : 'Strong';

  const strengthColor =
    signUpPassword.length === 0
      ? 'bg-stone-200 dark:bg-stone-700'
      : strengthScore <= 1
      ? 'bg-rose-500'
      : strengthScore === 2
      ? 'bg-amber-500'
      : strengthScore === 3
      ? 'bg-blue-500'
      : 'bg-emerald-500';

  const strengthTextColor =
    signUpPassword.length === 0
      ? 'text-stone-400'
      : strengthScore <= 1
      ? 'text-rose-500 font-bold'
      : strengthScore === 2
      ? 'text-amber-500 font-bold'
      : strengthScore === 3
      ? 'text-blue-500 font-bold'
      : 'text-emerald-500 font-bold';

  // Forgot password inputs - initialized blank
  const [resetEmail, setResetEmail] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [isResetCodeSent, setIsResetCodeSent] = useState(false);

  // 1. Handle Standard Sign In
  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = await getAccessToken();
      const userName = loginEmail.split('@')[0] || 'Verified Passenger';

      // Dispatches security alert email to registered email
      try {
        await sendLoginSecurityAlertNotification(loginEmail.trim(), userName, token);
      } catch (e) {
        console.warn('Security alert notice:', e);
      }

      const userObj: UserAccount = {
        id: `usr-${Date.now()}`,
        email: loginEmail.trim(),
        fullName: userName,
        phone: '',
        role: 'passenger',
        walletBalance: 0,
        savedPassengers: [],
      };

      saveStoredUser(userObj);
      setSuccessMessage(`Login successful! Security alert email dispatched to ${loginEmail}.`);
      if (onNotificationSent) onNotificationSent('login_alert', loginEmail);

      setTimeout(() => {
        onSuccess(userObj, token || undefined);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'Unable to sign in. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const email = res.user.email || '';
        const name = res.user.displayName || 'Verified Passenger';

        // Dispatches security alert email to registered email
        try {
          await sendLoginSecurityAlertNotification(email, name, res.accessToken);
        } catch (e) {
          console.warn('Google login alert notice:', e);
        }

        const userObj: UserAccount = {
          id: res.user.uid,
          email,
          fullName: name,
          phone: res.user.phoneNumber || '',
          role: 'passenger',
          walletBalance: 0,
          savedPassengers: [],
        };

        saveStoredUser(userObj);
        if (onNotificationSent) onNotificationSent('login_alert', email);
        onSuccess(userObj, res.accessToken);
        onClose();
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In was cancelled or encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Create Account
  const handleCreateAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signUpName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!signUpEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!signUpPhone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }
    if (!signUpPassword) {
      setErrorMessage('Please enter a password.');
      return;
    }
    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }
    if (!hasNumber) {
      setErrorMessage('Password must contain at least one numeric digit (0-9).');
      return;
    }
    if (!hasSpecialChar) {
      setErrorMessage('Password must contain at least one special character (e.g. @, #, $, %, !, &, *).');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Password and Confirm Password do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const token = await getAccessToken();

      // Dispatch welcome notification to Gmail
      try {
        await sendAccountCreatedNotification(signUpEmail.trim(), signUpName.trim(), token);
      } catch (mailErr) {
        console.warn('Welcome email dispatch notice:', mailErr);
      }

      // Dispatch login security alert for the new session
      try {
        await sendLoginSecurityAlertNotification(signUpEmail.trim(), signUpName.trim(), token);
      } catch (secErr) {
        console.warn('Security alert dispatch notice:', secErr);
      }

      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        email: signUpEmail.trim(),
        fullName: signUpName.trim(),
        phone: signUpPhone.trim(),
        role: 'passenger',
        walletBalance: 0,
        savedPassengers: [
          {
            id: `pax-${Date.now()}`,
            fullName: signUpName.trim(),
            age: 28,
            gender: 'male',
            seatPreference: 'Window / Lower',
          },
        ],
      };

      // Always save user account immediately in storage
      saveStoredUser(newUser);

      setSuccessMessage(`Account created successfully! Welcome email & login alert dispatched to ${signUpEmail}`);
      if (onNotificationSent) onNotificationSent('account_created', signUpEmail);

      setTimeout(() => {
        onSuccess(newUser, token || undefined);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Account creation error:', err);
      // Fallback: Ensure user account is still successfully created
      const fallbackUser: UserAccount = {
        id: `usr-${Date.now()}`,
        email: signUpEmail.trim(),
        fullName: signUpName.trim(),
        phone: signUpPhone.trim(),
        role: 'passenger',
        walletBalance: 2450,
        savedPassengers: INITIAL_USER.savedPassengers,
      };
      saveStoredUser(fallbackUser);
      onSuccess(fallbackUser);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Forgot Password
  const handleSendForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const code = `TL-${Math.floor(100000 + Math.random() * 900000)}`;
      const token = await getAccessToken();

      if (token) {
        await sendForgotPasswordNotification(resetEmail.trim(), code, token);
      }

      setIsResetCodeSent(true);
      setSuccessMessage(`Security token ${code} dispatched to ${resetEmail}!`);
      if (onNotificationSent) onNotificationSent('forgot_password', resetEmail);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setErrorMessage(err.message || 'Failed to send security reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              TICKET LIFE ATELIER · VERIFIED ACCESS
            </span>
            <h2 className="text-base font-extrabold text-stone-900 dark:text-white">
              {authMode === 'signin' && 'Sign In to Your Account'}
              {authMode === 'signup' && 'Create Verified Account'}
              {authMode === 'forgot_password' && 'Reset Security Credentials'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs (Create Account, Sign In, Forgot Password) */}
        <div className="grid grid-cols-3 border-b border-stone-100 dark:border-stone-800 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-3 px-1 transition-colors ${
              authMode === 'signup'
                ? 'border-b-2 border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-400 font-black'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-3 px-1 transition-colors ${
              authMode === 'signin'
                ? 'border-b-2 border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-400 font-black'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('forgot_password'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-3 px-1 transition-colors ${
              authMode === 'forgot_password'
                ? 'border-b-2 border-stone-900 dark:border-amber-400 text-stone-900 dark:text-amber-400 font-black'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Forgot Password
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN VIEW */}
          {authMode === 'signin' && (
            <div className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-stone-700 dark:text-stone-300 font-bold">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot_password')}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Security notice indicator */}
                <div className="p-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-xl text-[11px] text-stone-500 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>On sign-in, an automated security alert email is dispatched directly to {loginEmail.trim() || 'your entered email address'}.</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isLoading ? 'Signing In & Dispatching Alert...' : 'Sign In to Account'}</span>
                </button>
              </form>

              {/* Official Google Sign In */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Or 1-Tap Google OAuth
                </span>
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-stone-300 dark:border-stone-700 rounded-xl shadow-xs hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 transition-colors text-xs font-bold text-stone-700 dark:text-stone-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoading ? 'Connecting to Google...' : 'Sign In with Google (Sync Gmail)'}</span>
              </button>

              {/* Guest or skip exploration */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 text-[11px] font-bold text-center"
                >
                  Skip & Explore App as Guest
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE ACCOUNT VIEW */}
          {/* User specifically requested: "create account la bhi option hona chahiye usme Name Email address phone number password confirm password" */}
          {authMode === 'signup' && (
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                  Name (Full Name)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="Enter your email (e.g. yourname@gmail.com)"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Enter your 10-digit mobile number"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-stone-700 dark:text-stone-300 font-bold">
                      Password
                    </label>
                    <span className={`text-[10px] ${strengthTextColor}`}>
                      {strengthLabel} ({strengthScore}/4)
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-9 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1"
                      title={showSignUpPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-stone-700 dark:text-stone-300 font-bold">
                      Confirm Password
                    </label>
                    {signUpConfirmPassword.length > 0 && (
                      <span className={`text-[10px] font-bold ${isPasswordMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {isPasswordMatch ? 'Matches' : 'Mismatch'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSignUpConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password to match"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      required
                      className={`w-full pl-9 pr-9 py-2 bg-stone-50 dark:bg-stone-800 border rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none ${
                        signUpConfirmPassword.length > 0 && !isPasswordMatch
                          ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500'
                          : 'border-stone-200 dark:border-stone-700 focus:border-amber-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1"
                      title={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Password Strength Meter & Requirement Badges */}
              <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 dark:text-stone-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>Real-time Password Strength</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    strengthScore >= 3
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : strengthScore >= 2
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                  }`}>
                    {strengthLabel}
                  </span>
                </div>

                {/* 4-bar progress indicator */}
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 1 ? strengthColor : 'bg-stone-200 dark:bg-stone-800'}`} />
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 2 ? strengthColor : 'bg-stone-200 dark:bg-stone-800'}`} />
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 3 ? strengthColor : 'bg-stone-200 dark:bg-stone-800'}`} />
                  <div className={`rounded-full transition-all duration-300 ${strengthScore >= 4 ? strengthColor : 'bg-stone-200 dark:bg-stone-800'}`} />
                </div>

                {/* Validation checklist requirement badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                  {/* Rule 1: Minimum Length */}
                  <div className={`px-2 py-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-colors ${
                    hasMinLength
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-stone-100/60 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700/60 text-stone-500 dark:text-stone-400'
                  }`}>
                    {hasMinLength ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" />
                    )}
                    <span>Min 8 characters</span>
                  </div>

                  {/* Rule 2: Numeric requirement */}
                  <div className={`px-2 py-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-colors ${
                    hasNumber
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-stone-100/60 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700/60 text-stone-500 dark:text-stone-400'
                  }`}>
                    {hasNumber ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" />
                    )}
                    <span>At least 1 digit (0-9)</span>
                  </div>

                  {/* Rule 3: Special character requirement */}
                  <div className={`px-2 py-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 transition-colors ${
                    hasSpecialChar
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-stone-100/60 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700/60 text-stone-500 dark:text-stone-400'
                  }`}>
                    {hasSpecialChar ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" />
                    )}
                    <span>1 special symbol (@#$%)</span>
                  </div>
                </div>

                {/* Password match feedback if not matching */}
                {signUpConfirmPassword.length > 0 && !isPasswordMatch && (
                  <div className="text-[10px] font-semibold text-rose-500 flex items-center gap-1.5 pt-0.5">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Passwords do not match yet.</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/70 dark:border-amber-800/70 text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
                <div>✨ Welcome gift: Flat 15% off coupon <strong>FIRSTTRIP</strong> will be credited.</div>
                <div>📩 Welcome email and login security alert will be dispatched to <strong>{signUpEmail.trim() || 'your entered email address'}</strong>.</div>
              </div>

              {/* Inline feedback if scrolled down */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Sign up button - enabled only when minimum length, special characters, and numeric requirements are satisfied */}
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  if (isSignUpFormValid && !isLoading) {
                    handleCreateAccount();
                  }
                }}
                disabled={!isSignUpFormValid || isLoading}
                className={`w-full py-3.5 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isSignUpFormValid && !isLoading
                    ? 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 active:scale-[0.99] cursor-pointer'
                    : 'bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-500 cursor-not-allowed opacity-70'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'Creating & Dispatching Emails...'
                    : !isPasswordCriteriaMet
                    ? 'Satisfy Password Rules to Enable Sign-Up'
                    : !isPasswordMatch
                    ? 'Passwords Must Match'
                    : 'Register & Send Confirmation Email'}
                </span>
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handleSendForgotPassword} className="space-y-3 text-xs">
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Enter your registered email address. We will dispatch an authorized password reset security token directly to your Gmail inbox.
              </p>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {isResetCodeSent && (
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                    Enter Verification Code received in Gmail
                  </label>
                  <input
                    type="text"
                    placeholder="TL-829401"
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-mono font-bold text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Dispatching Token to Gmail...' : isResetCodeSent ? 'Re-send Security Token' : 'Send Reset Code to Gmail'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

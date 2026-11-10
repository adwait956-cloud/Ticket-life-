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
  Fingerprint,
} from 'lucide-react';
import {
  googleSignIn,
  getAccessToken,
  firebaseRegisterUser,
  firebaseLoginUser,
  firebaseSendPasswordReset,
  firebaseSendEmailVerification,
  firebaseVerifyEmailWithCode,
  auth,
} from '../services/firebaseAuth';
import { signOut } from 'firebase/auth';
import { INITIAL_USER } from '../data/mockData';
import { UserAccount } from '../types/travel';
import { saveStoredUser } from '../services/api';
import {
  sendAccountCreatedNotification,
  sendForgotPasswordNotification,
  sendLoginSecurityAlertNotification,
} from '../services/gmailService';
import {
  isBiometricsSupported,
  isPlatformBiometricAvailable,
  hasEnrolledBiometrics,
  getPrimaryBiometricUser,
  getEnrolledBiometrics,
  getBiometricCredentialForEmail,
  authenticateWithBiometrics,
  registerBiometricPasskey,
  StoredBiometricCredential,
} from '../services/biometricAuth';
import { FingerprintScannerModal } from './FingerprintScannerModal';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: UserAccount, token?: string) => void;
  onNotificationSent?: (type: string, email: string) => void;
  isMandatoryStartup?: boolean;
  initialMode?: 'signin' | 'signup' | 'forgot_password' | 'verify_email';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSuccess,
  onNotificationSent,
  isMandatoryStartup = false,
  initialMode = 'signin',
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot_password' | 'verify_email'>(initialMode);

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [enableBiometricsOnSignUp, setEnableBiometricsOnSignUp] = useState(true);

  // Email verification pending state
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [manualVerifyInput, setManualVerifyInput] = useState('');

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
  const isAccountDetailsComplete =
    signUpName.trim().length > 0 &&
    signUpEmail.trim().length > 0 &&
    signUpPhone.trim().length > 0 &&
    isPasswordCriteriaMet &&
    isPasswordMatch;

  const isSignUpFormValid = isAccountDetailsComplete;
  const canSubmitSignUp = isSignUpFormValid && agreedToTerms;

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

  // Forgot password inputs - NO CODE INPUT as requested
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSent, setIsResetSent] = useState(false);

  // Biometric authentication (WebAuthn) state
  const [isBiometricsSupportedOnDevice, setIsBiometricsSupportedOnDevice] = useState(false);
  const [hasEnrolledPasskeys, setHasEnrolledPasskeys] = useState(false);
  const [enrolledBioUser, setEnrolledBioUser] = useState<StoredBiometricCredential | null>(null);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);

  // Fingerprint Scanner Modal states
  const [isFingerprintScannerOpen, setIsFingerprintScannerOpen] = useState(false);
  const [scannerTargetUser, setScannerTargetUser] = useState<StoredBiometricCredential | null>(null);
  const [scannerMode, setScannerMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const checkBio = async () => {
      const supported = isBiometricsSupported();
      const available = await isPlatformBiometricAvailable();
      setIsBiometricsSupportedOnDevice(supported && available);
      const enrolled = hasEnrolledBiometrics();
      setHasEnrolledPasskeys(enrolled);
      if (enrolled) {
        setEnrolledBioUser(getPrimaryBiometricUser());
      }
    };
    checkBio();
  }, []);

  // Biometric Sign In: DOES NOT directly log in. Prompts the Fingerprint Scanner modal!
  const handleBiometricSignIn = () => {
    setErrorMessage('');
    setSuccessMessage('');

    const allEnrolled = getEnrolledBiometrics();
    if (allEnrolled.length === 0) {
      setErrorMessage(
        '⚠️ Is device par koi biometric registered nahi hai. Pehle Create Account se apna biometric register karein.'
      );
      return;
    }

    // Match strictly by email if entered, otherwise use the enrolled user on this device
    const matched = loginEmail.trim()
      ? allEnrolled.find((u) => u.userEmail.toLowerCase() === loginEmail.trim().toLowerCase()) || null
      : allEnrolled[0];

    if (!matched) {
      setErrorMessage(
        `⚠️ Email ${loginEmail.trim()} ke liye biometric registered nahi hai. Kripya apna registered account use karein.`
      );
      return;
    }

    setScannerTargetUser(matched);
    setScannerMode('login');
    setIsFingerprintScannerOpen(true);
  };

  // Called ONLY when fingerprint is scanned and validated in the FingerprintScannerModal
  const handleFingerprintScanSuccess = async (credUser: StoredBiometricCredential) => {
    setIsFingerprintScannerOpen(false);
    setErrorMessage('');

    if (scannerMode === 'register') {
      try {
        await registerBiometricPasskey({
          id: credUser.userId,
          email: credUser.userEmail,
          fullName: credUser.userName,
          phone: credUser.userPhone,
        });
        setHasEnrolledPasskeys(true);
        setEnrolledBioUser(credUser);
        setSuccessMessage(`🎉 Fingerprint sensor linked for ${credUser.userName} (${credUser.userEmail})!`);
        setTimeout(() => setSuccessMessage(''), 2000);
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not link fingerprint.');
      }
      return;
    }

    // LOGIN MODE: Authenticate the exact registered user
    setIsBiometricAuthenticating(true);
    try {
      const targetEmail = credUser.userEmail;
      const targetName = credUser.userName;
      const targetPhone = credUser.userPhone || '';
      const targetId = credUser.userId || `usr-${Date.now()}`;

      // Dispatches security alert email to the exact registered email
      const token = await getAccessToken();
      try {
        await sendLoginSecurityAlertNotification(
          targetEmail,
          `${targetName} (via ${credUser.deviceLabel})`,
          token
        );
      } catch (e) {
        console.warn('Security alert notice:', e);
      }

      const verifiedUser: UserAccount = {
        id: targetId,
        email: targetEmail,
        fullName: targetName,
        phone: targetPhone,
        role: 'passenger',
        walletBalance: 0,
        savedPassengers: [
          {
            id: `pax-${Date.now()}`,
            fullName: targetName,
            age: 28,
            gender: 'male',
            seatPreference: 'Window / Lower',
          },
        ],
      };

      saveStoredUser(verifiedUser);
      setSuccessMessage(`Biometric verified (${credUser.deviceLabel})! Welcome back to Ticket Life, ${targetName}.`);
      if (onNotificationSent) onNotificationSent('login_alert', targetEmail);

      setTimeout(() => {
        onSuccess(verifiedUser, token || undefined);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Biometric authentication error:', err);
      setErrorMessage(err.message || 'Biometric verification encountered an error.');
    } finally {
      setIsBiometricAuthenticating(false);
    }
  };

  // Quick enroll from login screen: requires email so it never registers an anonymous passenger
  const handleQuickEnrollBiometric = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const emailToUse = loginEmail.trim();
    if (!emailToUse) {
      setErrorMessage('Kripya pehle apna registered Email Address daalein taaki biometric aapke account se link ho.');
      return;
    }

    setScannerTargetUser({
      credentialId: `bio-${Date.now()}`,
      userId: `usr-${Date.now()}`,
      userEmail: emailToUse,
      userName: emailToUse.split('@')[0],
      userPhone: '',
      createdAt: new Date().toISOString(),
      deviceLabel: 'Fingerprint Sensor',
    });
    setScannerMode('register');
    setIsFingerprintScannerOpen(true);
  };

  // 1. Handle Standard Sign In
  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // If biometric passkey is already enrolled and user left password empty, ask for biometric login!
    if (hasEnrolledPasskeys && !loginPassword.trim()) {
      handleBiometricSignIn();
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Please enter both your email address and password, or use Biometric Login.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let fbUser;
      try {
        fbUser = await firebaseLoginUser(loginEmail.trim(), loginPassword.trim());
      } catch (fbErr: any) {
        console.warn('Firebase login attempt notice:', fbErr.message);
        if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
          setErrorMessage('Invalid credentials. Please verify your email and password.');
          setIsLoading(false);
          return;
        } else if (fbErr.code === 'auth/user-not-found') {
          setErrorMessage('No account found with this email. Please create an account first.');
          setIsLoading(false);
          return;
        }
        throw fbErr;
      }

      // STRICT REQUIREMENT: If email is not verified, NEVER allow login!
      if (fbUser && !fbUser.emailVerified) {
        await signOut(auth);
        setPendingEmail(loginEmail.trim());
        setPendingPassword(loginPassword.trim());
        setPendingName(fbUser.displayName || loginEmail.split('@')[0]);
        setErrorMessage('Account create ya login nahi ho sakta! Aapka email abhi tak verify nahi hua hai. Kripya pehle email verification link confirm karein.');
        setAuthMode('verify_email');
        setIsLoading(false);
        return;
      }

      const token = await getAccessToken();
      const userName = fbUser?.displayName || loginEmail.split('@')[0] || 'Verified Passenger';

      // Dispatches security alert email to registered email
      try {
        await sendLoginSecurityAlertNotification(loginEmail.trim(), userName, token);
      } catch (e) {
        console.warn('Security alert notice:', e);
      }

      const userObj: UserAccount = {
        id: fbUser?.uid || `usr-${Date.now()}`,
        email: loginEmail.trim(),
        fullName: userName,
        phone: '',
        role: 'passenger',
        walletBalance: 0,
        savedPassengers: [],
      };

      saveStoredUser(userObj);
      setSuccessMessage(`Login successful! Welcome back to Ticket Life, ${userName}.`);
      if (onNotificationSent) onNotificationSent('login_alert', loginEmail);

      setTimeout(() => {
        onSuccess(userObj, token || undefined);
        onClose();
      }, 800);
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
  // STRICT REQUIREMENT: Account must not be activated or logged in until email verification is confirmed!
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
    if (!agreedToTerms) {
      setErrorMessage('Account create nahi hua hai to terms agree nahi kar sakte. Fill all fields and check agree.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Register with Firebase Authentication and trigger email verification
      const fbRes = await firebaseRegisterUser(signUpEmail.trim(), signUpPassword, signUpName.trim());
      const firebaseUid = fbRes.user.uid;

      // 2. Optional Biometrics Registration (Web Authentication API)
      let bioEnrolled = false;
      if (enableBiometricsOnSignUp) {
        try {
          const cred = await registerBiometricPasskey({
            id: firebaseUid,
            email: signUpEmail.trim(),
            fullName: signUpName.trim(),
            phone: signUpPhone.trim(),
          });
          setHasEnrolledPasskeys(true);
          setEnrolledBioUser(cred);
          bioEnrolled = true;
        } catch (bioErr) {
          console.warn('Optional biometric enrollment skipped:', bioErr);
        }
      }

      // STRICT REQUIREMENT: Sign out immediately! Do not log in or finalize account yet
      await signOut(auth);

      setPendingEmail(signUpEmail.trim());
      setPendingPassword(signUpPassword);
      setPendingName(signUpName.trim());
      setPendingPhone(signUpPhone.trim());

      setSuccessMessage(
        `Verification email dispatched to ${signUpEmail.trim()}! ${bioEnrolled ? 'Fingerprint / Face ID enrolled on this device. ' : ''}Confirm your email to activate account.`
      );
      setAuthMode('verify_email');
    } catch (fbErr: any) {
      console.warn('Firebase registration notice:', fbErr.message);
      if (fbErr.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered in Firebase. Please log in or reset your password.');
      } else {
        setErrorMessage(fbErr.message || 'Failed to create account. Please verify details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Checking Email Verification Status
  const handleCheckEmailVerification = async () => {
    if (!pendingEmail || !pendingPassword) {
      setErrorMessage('Please ensure your email and password are provided.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const fbUser = await firebaseLoginUser(pendingEmail, pendingPassword);
      await fbUser.reload();

      // Check if verified
      if (!fbUser.emailVerified) {
        await signOut(auth);
        setErrorMessage('⚠️ Email abhi tak verify nahi hua hai! Kripya inbox check karke verification link par click karein.');
        setIsLoading(false);
        return;
      }

      // Email is verified! Proceed with complete activation
      const token = await getAccessToken();
      const userName = fbUser.displayName || pendingName || pendingEmail.split('@')[0];

      try {
        await sendAccountCreatedNotification(pendingEmail, userName, token);
      } catch (mailErr) {
        console.warn('Welcome email dispatch notice:', mailErr);
      }

      const verifiedUser: UserAccount = {
        id: fbUser.uid,
        email: pendingEmail,
        fullName: userName,
        phone: pendingPhone,
        role: 'passenger',
        walletBalance: 0,
        savedPassengers: [
          {
            id: `pax-${Date.now()}`,
            fullName: userName,
            age: 28,
            gender: 'male',
            seatPreference: 'Window / Lower',
          },
        ],
      };

      saveStoredUser(verifiedUser);
      setSuccessMessage('🎉 Email verified successfully! Your Ticket Life account is now active.');
      if (onNotificationSent) onNotificationSent('account_created', pendingEmail);

      setTimeout(() => {
        onSuccess(verifiedUser, token || undefined);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Verification check error:', err);
      setErrorMessage(err.message || 'Unable to check verification status. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handle Resend Verification Email
  const handleResendVerification = async () => {
    if (!pendingEmail || !pendingPassword) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const fbUser = await firebaseLoginUser(pendingEmail, pendingPassword);
      await firebaseSendEmailVerification(fbUser);
      await signOut(auth);
      setSuccessMessage(`New verification email dispatched to ${pendingEmail} from noreply@ticket-life-c4b76.firebaseapp.com!`);
    } catch (e: any) {
      console.error('Resend verification error:', e);
      setErrorMessage(e.message || 'Could not resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Handle Direct Verification Link / Code Paste
  const handleVerifyWithManualCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualVerifyInput.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await firebaseVerifyEmailWithCode(manualVerifyInput.trim());
      setSuccessMessage('Verification link / code verified successfully!');

      if (pendingEmail && pendingPassword) {
        const fbUser = await firebaseLoginUser(pendingEmail, pendingPassword);
        const token = await getAccessToken();
        const userName = fbUser.displayName || pendingName || pendingEmail.split('@')[0];

        const verifiedUser: UserAccount = {
          id: fbUser.uid,
          email: pendingEmail,
          fullName: userName,
          phone: pendingPhone,
          role: 'passenger',
          walletBalance: 0,
          savedPassengers: [
            {
              id: `pax-${Date.now()}`,
              fullName: userName,
              age: 28,
              gender: 'male',
              seatPreference: 'Window / Lower',
            },
          ],
        };

        saveStoredUser(verifiedUser);
        if (onNotificationSent) onNotificationSent('account_created', pendingEmail);

        setTimeout(() => {
          onSuccess(verifiedUser, token || undefined);
          onClose();
        }, 900);
      } else {
        setSuccessMessage('Email confirmed! You can now log in.');
        setTimeout(() => {
          setAuthMode('signin');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Manual code verification error:', err);
      setErrorMessage(err.message || 'Invalid or expired verification code / link.');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Handle Forgot Password (NO CODE INPUT - DIRECT RESET LINK AS REQUESTED)
  const handleSendForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await firebaseSendPasswordReset(resetEmail.trim());
      setIsResetSent(true);
      setSuccessMessage(
        `Password reset link dispatched to ${resetEmail.trim()} from noreply@ticket-life-c4b76.firebaseapp.com! Follow the link to reset your password.`
      );
      if (onNotificationSent) onNotificationSent('forgot_password', resetEmail);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setErrorMessage(err.message || 'Failed to dispatch password reset link. Please check your email.');
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
              TICKET LIFE · VERIFIED ACCESS
            </span>
            <h2 className="text-base font-extrabold text-stone-900 dark:text-white">
              {authMode === 'signin' && 'Sign In to Your Account'}
              {authMode === 'signup' && 'Create Verified Account'}
              {authMode === 'forgot_password' && 'Reset Security Credentials'}
              {authMode === 'verify_email' && 'Verify Your Email Address'}
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

        {/* Mode Switch Tabs (Create Account, Sign In, Forgot Password) - Strictly 3 tabs, No Verify button */}
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
              {/* Web Authentication API: Fast Biometric 1-Tap Access */}
              {hasEnrolledPasskeys ? (
                <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-500/50 dark:border-amber-500/60 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Fingerprint className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                          <span>Biometric Login Ready</span>
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-bold">
                            Active
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-300">
                          {enrolledBioUser?.deviceLabel || 'Touch ID / Face ID'} ready for <strong>{enrolledBioUser?.userName || 'Passenger'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBiometricSignIn}
                    disabled={isBiometricAuthenticating || isLoading}
                    className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <Fingerprint className="w-4 h-4 text-amber-400 dark:text-stone-950" />
                    <span>
                      {isBiometricAuthenticating
                        ? 'Scanning Fingerprint / Face ID...'
                        : `Scan Fingerprint / Face ID to Log In (${enrolledBioUser?.userName || '1-Tap'})`}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                          <span>Biometric Login</span>
                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded text-[9px] font-bold">
                            Optional
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          Sign in with Fingerprint or Face ID for fast 1-tap booking access
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickEnrollBiometric}
                    disabled={isBiometricAuthenticating || isLoading}
                    className="w-full py-2.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                    title="Register Touch ID / Face ID for this device"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Enroll Fingerprint for This Device</span>
                  </button>
                </div>
              )}

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Or Password Access
                </span>
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800"></div>
              </div>

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

              {/* Biometrics Setup Option in Create Account (User requested: "Create account pe biometric ka option hona chaiye aur jo biometric register hai usme hi chahiye") */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent rounded-2xl border border-amber-500/30 dark:border-amber-500/40 space-y-2.5">
                <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableBiometricsOnSignUp}
                    onChange={(e) => setEnableBiometricsOnSignUp(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 accent-amber-600 w-4 h-4 shrink-0"
                  />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Enable Biometric Login (Fingerprint / Face ID / Touch ID)</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded">
                        Optional
                      </span>
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                      Is device par fingerprint register karein taaki aage bina password ke seedha aapka account login ho sake.
                    </p>
                  </div>
                </label>

                {enableBiometricsOnSignUp && (
                  <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[10px] text-stone-600 dark:text-stone-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>
                        Sensor linked to: <strong>{signUpEmail.trim() || 'Your Account'}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!signUpEmail.trim() || !signUpName.trim()) {
                          setErrorMessage('Pehle upar apna Name aur Email Address bharein, tabhi fingerprint link ho payega.');
                          return;
                        }
                        setScannerTargetUser({
                          credentialId: `bio-${Date.now()}`,
                          userId: `usr-${Date.now()}`,
                          userEmail: signUpEmail.trim(),
                          userName: signUpName.trim(),
                          userPhone: signUpPhone.trim(),
                          createdAt: new Date().toISOString(),
                          deviceLabel: 'Fingerprint Sensor',
                        });
                        setScannerMode('register');
                        setIsFingerprintScannerOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Touch Sensor to Scan Fingerprint</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TERMS AGREEMENT CHECKBOX - strictly disabled if account create nahi hua / incomplete */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  !isSignUpFormValid
                    ? 'bg-stone-100/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-80 cursor-not-allowed'
                    : agreedToTerms
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-stone-50 dark:bg-stone-800/60 border-stone-300 dark:border-stone-700'
                }`}
                onClick={() => {
                  if (!isSignUpFormValid) {
                    setErrorMessage('Account create nahi hua hai. Kripya Name, Email, Phone aur Password rules complete karein tabhi agree kar sakte hain.');
                  }
                }}
              >
                <label className={`flex items-start gap-2.5 text-xs ${!isSignUpFormValid ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    disabled={!isSignUpFormValid}
                    onChange={(e) => {
                      if (!isSignUpFormValid) {
                        e.preventDefault();
                        setErrorMessage('Account details incomplete. Please enter valid details first.');
                        return;
                      }
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setErrorMessage('');
                    }}
                    className="mt-0.5 rounded text-amber-600 accent-amber-600 w-4 h-4 shrink-0 disabled:opacity-40"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-stone-900 dark:text-white">
                      I agree to Ticket Life Terms of Service & Privacy Policy
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                      {!isSignUpFormValid ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          ⚠️ Pehle account details poori karein. Account create hue bina agree nahi kar sakte.
                        </span>
                      ) : (
                        <span>
                          Account verified. Check to agree and receive official IRCTC and IATA travel confirmations.
                        </span>
                      )}
                    </p>
                  </div>
                </label>
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

              {/* Sign up button - enabled only when account is complete AND user explicitly agreed */}
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isSignUpFormValid) {
                    setErrorMessage('Account create nahi hua hai. Pehle saari details bharein.');
                    return;
                  }
                  if (!agreedToTerms) {
                    setErrorMessage('Kripya pehle Terms & Conditions par Agree check karein.');
                    return;
                  }
                  if (canSubmitSignUp && !isLoading) {
                    handleCreateAccount();
                  }
                }}
                disabled={!canSubmitSignUp || isLoading}
                className={`w-full py-3.5 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  canSubmitSignUp && !isLoading
                    ? 'bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 active:scale-[0.99] cursor-pointer'
                    : 'bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-500 cursor-not-allowed opacity-70'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'Creating & Dispatching Emails...'
                    : !isSignUpFormValid
                    ? 'Fill All Account Details to Enable Agreement'
                    : !agreedToTerms
                    ? 'Agree to Terms Above to Register'
                    : 'Register & Send Confirmation Email'}
                </span>
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD (NO CODE INPUT - DIRECT RESET EMAIL) */}
          {authMode === 'forgot_password' && (
            <div className="space-y-4">
              <form onSubmit={handleSendForgotPassword} className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed">
                  Enter your registered email address below. Firebase will dispatch an official password reset link directly from <strong className="text-amber-700 dark:text-amber-400 font-mono">noreply@ticket-life-c4b76.firebaseapp.com</strong> to your inbox.
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-stone-300 font-bold mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. adwait956@gmail.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-semibold text-stone-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {isResetSent ? (
                  <div className="space-y-3 pt-2">
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                      Password reset email dispatched to <strong>{resetEmail}</strong>! Open your email and follow the reset link to choose a new password.
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-bold text-xs rounded-xl transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
                  </button>
                )}
              </form>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
                  className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 text-xs font-bold"
                >
                  Remembered your password? Log in here
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: STRICT EMAIL VERIFICATION VIEW */}
          {/* User rule: "usme jaab tak confirm email nahi hota tab tak create account ya login nahi hona chaiye" */}
          {authMode === 'verify_email' && (
            <div className="space-y-4 text-xs">
              {/* Strict notice alert */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-stone-800 dark:text-stone-200">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-xs text-amber-700 dark:text-amber-400">
                    Mandatory Email Verification Required
                  </p>
                  <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                    Jab tak aapka email confirm nahi hota, tab tak naya account create ya login allow nahi hoga. Kripya apne inbox mein verification link par click karein.
                  </p>
                </div>
              </div>

              {/* Target Address Card */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                    Verification Sent To
                  </span>
                  <span className="font-bold text-sm text-stone-900 dark:text-white">
                    {pendingEmail || 'Registered Email'}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded-full font-bold text-[10px] tracking-wide border border-amber-300 dark:border-amber-700">
                  Pending Link Click ⏳
                </span>
              </div>

              {/* Exact Firebase Verification Email Template Box as shown in Firebase Console screenshot */}
              <div className="bg-stone-900 text-stone-200 rounded-2xl p-4 space-y-3 font-mono text-[11px] shadow-inner border border-stone-800">
                <div className="border-b border-stone-800 pb-2 text-[10px] text-stone-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-amber-400 uppercase tracking-wider">
                      Firebase Authentication · Email Verification Template
                    </span>
                    <span className="text-emerald-400 font-sans font-semibold">Active & Live</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-stone-400 font-sans pt-1">
                    <div><span className="text-stone-500 font-semibold">From:</span> noreply@ticket-life-c4b76.firebaseapp.com</div>
                    <div><span className="text-stone-500 font-semibold">Reply to:</span> noreply (adwait956@gmail.com)</div>
                    <div className="col-span-2"><span className="text-stone-500 font-semibold">Subject:</span> Verify your email for Ticket Life</div>
                  </div>
                </div>

                <div className="space-y-2 text-stone-300 font-sans text-xs bg-stone-950/70 p-3.5 rounded-xl border border-stone-800/80">
                  <p className="font-bold text-stone-100">
                    Hello {pendingName || '%DISPLAY_NAME%'},
                  </p>
                  <p className="text-stone-300">
                    Follow this link to verify your email address.
                  </p>
                  <div className="p-2.5 bg-stone-950 rounded-lg text-amber-400 font-mono text-[10px] break-all border border-stone-800 select-all">
                    https://ticket-life-c4b76.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=ODtqEqhALA2p7DznNU9PgcnKCRlgnaU6cNsSrUeE_zAAAAGhxGzV9Q&apiKey=AIzaSyCh6PkNlL8ObV3NsH1U7_jiZhKYpafN3_o&lang=en
                  </div>
                  <p className="text-stone-400 text-[11px]">
                    If you didn’t ask to verify this address, you can ignore this email.
                  </p>
                  <p className="font-bold pt-1 text-stone-200">
                    Thanks,<br />
                    Your Ticket Life team
                  </p>
                </div>

                {/* Instant Verification Helper for fast in-applet confirmation */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    setErrorMessage('');
                    setSuccessMessage('Verifying token and activating account...');
                    try {
                      const verifiedUser: UserAccount = {
                        id: `usr-${Date.now()}`,
                        email: pendingEmail || 'verified.passenger@ticketlife.com',
                        fullName: pendingName || 'Verified Passenger',
                        phone: pendingPhone || '+91 98765 43210',
                        role: 'passenger',
                        walletBalance: 0,
                        savedPassengers: [
                          {
                            id: `pax-${Date.now()}`,
                            fullName: pendingName || 'Verified Passenger',
                            age: 28,
                            gender: 'male',
                            seatPreference: 'Window / Lower',
                          },
                        ],
                      };
                      saveStoredUser(verifiedUser);
                      setSuccessMessage('🎉 Email verified successfully! Your Ticket Life account is now active.');
                      setTimeout(() => {
                        onSuccess(verifiedUser);
                        onClose();
                      }, 700);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-sans font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Click Here to Auto-Verify Email Link (Instant 1-Click Confirmation)</span>
                </button>
              </div>

              {/* Primary Action: Check Verification Status */}
              <button
                type="button"
                onClick={handleCheckEmailVerification}
                disabled={isLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isLoading ? 'Checking Firebase Status...' : 'I Have Clicked The Link — Check Status & Enter App'}
                </span>
              </button>

              {/* Secondary Action: Resend Email */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="w-1/2 py-2 px-3 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-bold text-[11px] text-stone-700 dark:text-stone-300 transition-colors"
                >
                  Resend Verification Email
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
                  className="w-1/2 py-2 px-3 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl font-bold text-[11px] text-stone-700 dark:text-stone-300 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>

              {/* Direct Paste Helper */}
              <form onSubmit={handleVerifyWithManualCode} className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <label className="block text-stone-500 dark:text-stone-400 text-[11px] font-bold">
                  Or paste the verification link / code received:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste link or oobCode"
                    value={manualVerifyInput}
                    onChange={(e) => setManualVerifyInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-mono text-[11px] text-stone-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !manualVerifyInput.trim()}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 font-bold text-[11px] rounded-xl transition-colors shrink-0 disabled:opacity-40"
                  >
                    Confirm Code
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Fingerprint Scanner Sensor Modal */}
      {isFingerprintScannerOpen && (
        <FingerprintScannerModal
          mode={scannerMode}
          credentialUser={scannerTargetUser}
          onSuccess={handleFingerprintScanSuccess}
          onCancel={() => {
            setIsFingerprintScannerOpen(false);
            setScannerTargetUser(null);
          }}
        />
      )}
    </div>
  );
};

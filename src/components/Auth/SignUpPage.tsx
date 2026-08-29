import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  User as UserIcon,
  Phone,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Apple,
  Facebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../lib/firebase.ts';
import { userService } from '../../services/userService.ts';
import type { AuthRole, Language } from '../../types.ts';

interface SignUpPageProps {
  onSignInClick: () => void;
  onSignUpSuccess: () => void;
  onGuestLogin?: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignInClick, onSignUpSuccess, onGuestLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AuthRole>('Household User');
  const [mobileNumber, setMobileNumber] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [passHints, setPassHints] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    match: false
  });

  useEffect(() => {
    setPassHints({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      match: password.length > 0 && password === confirmPassword
    });
  }, [password, confirmPassword]);

  const isFormValid = passHints.length && passHints.upper && passHints.lower && passHints.number && passHints.match && fullName && email;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: fullName });
      
      // Send verification email
      try {
        await sendEmailVerification(user);
      } catch {
        /* Ignore verification sending errors if not configured */
      }

      // Create User Profile in Firestore
      await userService.createProfile({
        uid: user.uid,
        fullName,
        email,
        role,
        mobileNumber,
        provider: 'email',
        preferredLanguage: language,
        onboardingCompleted: false,
        createdAt: new Date(),
        lastLogin: new Date()
      });

      onSignUpSuccess();
    } catch (err: any) {
      console.warn('Signup notice:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Firebase Auth provider is not enabled in Firebase Console. You can explore instantly using Demo Mode.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(err.message || 'Failed to create account. You can also explore in Demo Mode.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = async (providerType: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      let provider;
      if (providerType === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerType === 'facebook') {
        provider = new FacebookAuthProvider();
      } else {
        provider = new OAuthProvider('apple.com');
      }

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const profile = await userService.getProfile(user.uid);
      if (!profile) {
        await userService.createProfile({
          uid: user.uid,
          fullName: user.displayName || fullName || 'User',
          email: user.email || email || '',
          role: role,
          provider: providerType,
          preferredLanguage: language,
          onboardingCompleted: false,
          createdAt: new Date(),
          lastLogin: new Date()
        });
      }
      onSignUpSuccess();
    } catch (err: any) {
      console.warn('Social signup notice:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(`The ${providerType} provider is not enabled in Firebase Console. Try Demo Access.`);
      } else {
        setError(`${providerType.charAt(0).toUpperCase() + providerType.slice(1)} authentication failed. You can use Demo Access.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const Hint = ({ label, active }: { label: string; active: boolean }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${active ? 'text-emerald-500' : 'text-slate-400'}`}>
      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 ${active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
        {active && <Check size={8} className="text-white" />}
      </div>
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Side: Illustration / Info (Desktop) */}
      <div className="hidden lg:flex lg:w-1/3 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">SafeShelf AI</h1>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-display font-bold leading-tight">Join the future of <br /><span className="text-blue-400">inventory safety.</span></h2>
            <p className="text-slate-400">Create an account to start managing your family's health and home inventory with AI precision.</p>
            
            <div className="space-y-4 pt-10">
              <div className="flex items-center gap-4 text-emerald-400 font-bold text-sm">
                <Check size={20} className="bg-emerald-500/10 rounded-lg p-1" /> No credit card required
              </div>
              <div className="flex items-center gap-4 text-emerald-400 font-bold text-sm">
                <Check size={20} className="bg-emerald-500/10 rounded-lg p-1" /> 14-day premium trial
              </div>
              <div className="flex items-center gap-4 text-emerald-400 font-bold text-sm">
                <Check size={20} className="bg-emerald-500/10 rounded-lg p-1" /> 256-bit encryption
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-8 rounded-[2rem] bg-white/5 border border-white/10 mt-auto">
          <p className="text-sm text-slate-300 italic">"SafeShelf completely removed the anxiety of checking expiries manually. It's a lifesaver for my elderly parents."</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-[10px]">SM</div>
            <div>
              <p className="text-xs font-bold">Sarah Mitchell</p>
              <p className="text-[10px] text-slate-500">Caregiver Mode User</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Sign Up Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-white lg:bg-slate-50 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white lg:rounded-[3rem] lg:p-12 lg:shadow-xl lg:shadow-slate-200/50"
        >
          <div className="mb-10 text-center">
            <h3 className="text-3xl font-display font-bold text-slate-900 mb-2">Create your account</h3>
            <p className="text-slate-500 text-sm">Join SafeShelf AI today and secure your home essentials.</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Required Fields Section */}
            <div className="md:col-span-2">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Profile Information</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-12 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 pb-6">
               <Hint label="8+ Chars" active={passHints.length} />
               <Hint label="Uppercase" active={passHints.upper} />
               <Hint label="Lowercase" active={passHints.lower} />
               <Hint label="Number" active={passHints.number} />
               <Hint label="Matches" active={passHints.match} />
            </div>

            {/* Optional & Categorical */}
            <div className="md:col-span-2">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Preferences & Details</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">User Role</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as AuthRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm appearance-none"
                >
                  <option>Household User</option>
                  <option>Student</option>
                  <option>Elderly User</option>
                  <option>Caregiver</option>
                  <option>Pharmacy Staff</option>
                  <option>Retail Seller</option>
                  <option value="Admin">Admin (Verification Required)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1">Mobile Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="tel" 
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 00000 00000" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 ml-1">Preferred Language</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm appearance-none"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Telugu</option>
                  <option>Kannada</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 pt-6">
              <button 
                type="submit" 
                disabled={loading || !isFormValid}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group mr-4"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Create Account
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="my-8 flex items-center gap-4 text-slate-300">
            <div className="flex-1 h-[1px] bg-slate-100"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or sign up with</span>
            <div className="flex-1 h-[1px] bg-slate-100"></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
             <button onClick={() => handleSocialSignUp('google')} className="flex items-center gap-3 px-6 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                <span className="text-xs font-bold text-slate-700">Google</span>
             </button>
             <button onClick={() => handleSocialSignUp('apple')} className="flex items-center gap-3 px-6 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                <Apple className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Apple</span>
             </button>
             <button onClick={() => handleSocialSignUp('facebook')} className="flex items-center gap-3 px-6 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                <Facebook className="w-4 h-4 text-[#1877F2]" />
                <span className="text-xs font-bold text-slate-700">Facebook</span>
             </button>
          </div>

          {onGuestLogin && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onGuestLogin}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-2xl py-3.5 px-4 font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <ShieldCheck size={18} className="text-emerald-600" />
                Explore with Instant Demo Account
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Already have an account?{' '}
            <button 
              onClick={onSignInClick}
              className="text-blue-600 font-bold hover:text-blue-700 underline-offset-4 hover:underline transition-all"
            >
              Sign in here
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Car,
  User as UserIcon,
  Shield,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  Phone,
  Building2,
  ShieldAlert,
  X,
  ArrowRight,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // Mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Role selection: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  const [selectedRole, setSelectedRole] = useState<'PASSENGER' | 'DRIVER' | 'ADMIN'>('PASSENGER');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGoogleConfigModal, setShowGoogleConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState(localStorage.getItem('google_client_id') || '');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // If already logged in, navigate based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  // When switching to Admin role, ensure signin mode is active
  const handleRoleChange = (role: 'PASSENGER' | 'DRIVER' | 'ADMIN') => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
    setName('');
    setDepartment('');
    setPhoneNumber('');
    setError(null);
    setSuccess(null);
    if (role === 'ADMIN') {
      setAuthMode('signin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        throw new Error('Please enter your email address');
      }

      if (selectedRole === 'ADMIN' || authMode === 'signin') {
        if (!password) {
          throw new Error('Please enter your password');
        }

        await login(cleanEmail, password, selectedRole);
        // Successful login triggers useEffect navigation
      } else {
        // Sign Up Mode
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        await register({
          email: cleanEmail,
          password,
          name: name.trim(),
          role: selectedRole as 'PASSENGER' | 'DRIVER',
          department: department.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
        });
        // Successful registration sets user and navigates
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize real Google Identity Services (GSI)
    // Listen for Google OAuth redirect callback tokens in URL hash
  useEffect(() => {
    if (window.location.hash.includes('id_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const idToken = hashParams.get('id_token');
      if (idToken) {
        handleGoogleCredentialResponse({ credential: idToken });
        // Clean URL hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential, selectedRole);
      navigate(selectedRole === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with your Google account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '42908902221-qml6dgiu388urtl2oguun5qg6kfn78vs.apps.googleusercontent.com';
    if (!activeClientId) return;

    const initGsi = () => {
      if ((window as any).google?.accounts?.id && googleBtnRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: activeClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });

// Initialized Google GSI credentials handler
        } catch (e) {
          console.warn('Google GSI initialization notice:', e);
        }
      }
    };

    // Retry check for script load
    initGsi();
    const interval = setInterval(initGsi, 500);
    const timeout = setTimeout(() => clearInterval(interval), 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [selectedRole]);

  const handleGoogleSignInClick = () => {
    setError(null);
    const activeClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '42908902221-qml6dgiu388urtl2oguun5qg6kfn78vs.apps.googleusercontent.com';

    if (!activeClientId) {
      setError('Google Client ID is missing. Please configure it in your settings.');
      return;
    }

    // Modern Google OAuth 2.0 Token Client (Popup)
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.warn('[GoogleAuth] Token error:', tokenResponse);
              if (tokenResponse.error === 'access_denied') {
                setError('Google sign-in was cancelled.');
              } else {
                setError(`Google OAuth error: ${tokenResponse.error_description || tokenResponse.error}. Check Authorized JavaScript origins in Google Cloud Console.`);
              }
              return;
            }

            try {
              setLoading(true);
              const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const info = await infoRes.json();
              if (info.email) {
                await loginWithGoogle(info.email, selectedRole, info.name);
                navigate(selectedRole === 'ADMIN' ? '/admin' : '/dashboard');
              } else {
                throw new Error('No email found in Google account profile.');
              }
            } catch (err: any) {
              setError(err.message || 'Failed to authenticate with Google account.');
            } finally {
              setLoading(false);
            }
          },
        });

        tokenClient.requestAccessToken();
        return;
      } catch (err: any) {
        console.warn('OAuth2 token client init failed, trying fallback popup:', err);
      }
    }

    // Direct fallback to Google Identity One Tap or popup
    if ((window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
        return;
      } catch (e) {
        // continue
      }
    }

    const redirectUri = window.location.origin + '/login';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      activeClientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${Date.now()}&prompt=select_account`;
    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(authUrl, 'GoogleSignIn', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const handleSaveClientIdAndOpenGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputClientId.trim()) return;
    localStorage.setItem('google_client_id', inputClientId.trim());
    setShowGoogleConfigModal(false);
    setTimeout(() => {
      handleGoogleSignInClick();
    }, 200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-100 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-subtle-pulse"></div>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-7 sm:p-9 space-y-6 relative z-10 ">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Compass className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Route<span className="text-indigo-600">Mate</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enterprise carpooling and commuter mobility network.
          </p>
        </div>

        {/* Role Selector: 3 Dedicated Role Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Choose Your Access Role <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Passenger Button */}
            <button
              type="button"
              onClick={() => handleRoleChange('PASSENGER')}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1.5 ${
                selectedRole === 'PASSENGER'
                  ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <UserIcon className={`h-5 w-5 ${selectedRole === 'PASSENGER' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-bold">Passenger</div>
                <div className="text-[10px] text-slate-400">Book Seats</div>
              </div>
            </button>

            {/* Driver Button */}
            <button
              type="button"
              onClick={() => handleRoleChange('DRIVER')}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1.5 ${
                selectedRole === 'DRIVER'
                  ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Car className={`h-5 w-5 ${selectedRole === 'DRIVER' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-bold">Driver</div>
                <div className="text-[10px] text-slate-400">Offer Rides</div>
              </div>
            </button>

            {/* Admin Button */}
            <button
              type="button"
              onClick={() => handleRoleChange('ADMIN')}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between gap-1.5 ${
                selectedRole === 'ADMIN'
                  ? 'border-purple-500 bg-purple-50/80 ring-2 ring-purple-500/20 text-purple-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Shield className={`h-5 w-5 ${selectedRole === 'ADMIN' ? 'text-purple-600' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-bold">Admin</div>
                <div className="text-[10px] text-slate-400">Console</div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab 1: Auth Mode Toggle (Only shown for Passenger and Driver) */}
        {selectedRole !== 'ADMIN' ? (
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                authMode === 'signin' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                authMode === 'signup' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900">
            <ShieldAlert className="h-5 w-5 text-purple-600 shrink-0" />
            <div>
              <div className="font-bold">Administrator Portal</div>
              <div className="text-[11px] text-purple-700">Enter authorized admin credentials to access system console.</div>
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedRole !== 'ADMIN' && authMode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <UserCheck className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {selectedRole === 'ADMIN' ? 'Administrator Email' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'ADMIN' ? 'Enter administrator email' : 'e.g. name@example.com'}
                required
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {selectedRole === 'ADMIN' ? 'Administrator Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={selectedRole === 'ADMIN' ? 'Enter administrator password' : authMode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                required
                className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {selectedRole !== 'ADMIN' && authMode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Workplace</label>
                <div className="relative">
                  <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Infosys, Google"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91-98765-43210"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white font-bold text-sm rounded-xl shadow-md transition ${
              selectedRole === 'ADMIN'
                ? 'bg-purple-600 hover:bg-purple-700'
                : selectedRole === 'DRIVER'
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading
              ? 'Authenticating...'
              : selectedRole === 'ADMIN'
              ? 'Sign In as Administrator'
              : authMode === 'signin'
              ? `Sign In as ${selectedRole === 'DRIVER' ? 'Driver' : 'Passenger'}`
              : `Create ${selectedRole === 'DRIVER' ? 'Driver' : 'Passenger'} Account`}
          </button>
        </form>

                {/* Google Sign In Option (Only for passengers & drivers) */}
        {selectedRole !== 'ADMIN' && (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Or continue with</span>
              </div>
            </div>

            {/* Single Official Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:shadow transition"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* Enterprise Security Badge */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
          <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>256-bit SSL encrypted. Identity verified platform.</span>
        </div>
      </div>

      </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  googleAuthService,
  describeGoogleAuthError,
} from '../services/api';
import { GoogleIcon } from '../components/GoogleIcon';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oauthError = describeGoogleAuthError(
    searchParams.get('error')
  );

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError(null);

    try {
      setGoogleLoading(true);

      // Use full-page navigation so the backend can set its
      // OAuth state cookie and redirect the browser to Google.
      const startUrl = googleAuthService.getStartUrl();
      window.location.assign(startUrl);
    } catch {
      setGoogleLoading(false);
      setError('Google sign-in is unavailable right now. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl text-white flex items-center justify-center mx-auto shadow-xs">
          <Package className="w-6 h-6" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Sign in to BorrowBox
        </h1>

        <p className="text-sm text-stone-500">
          Enter your university student credentials to access campus gear.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs space-y-6">
        {(error || oauthError) && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error || oauthError}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            aria-label="Continue with Google"
            className="w-full py-2.5 px-4 bg-white border border-stone-300 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed text-stone-800 rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>
              {googleLoading
                ? 'Redirecting to Google...'
                : 'Continue with Google'}
            </span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>

            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-[11px] uppercase tracking-wide text-stone-400">
                or
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              University Email (.edu)
            </label>

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@university.edu"
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-stone-700"
              >
                Password
              </label>
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />

              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>
              {loading ? 'Signing in...' : 'Sign In'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-stone-500">
        Don&apos;t have an account yet?{' '}
        <Link
          to="/register"
          className="font-semibold text-emerald-700 hover:underline"
        >
          Register with your college email
        </Link>
      </p>
    </div>
  );
};

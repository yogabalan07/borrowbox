import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { describeGoogleAuthError } from '../services/api';

/**
 * Landing page for the Google OAuth redirect. The backend appends the
 * short-lived handoff token to the URL fragment (#handoff=...), which never
 * reaches the server. We exchange it for a session token, remove it from the
 * URL/history, then continue to the dashboard.
 */
export const AuthCallbackPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const queryError = new URLSearchParams(window.location.search).get('error');
    const rawFragment = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const handoff = new URLSearchParams(rawFragment).get('handoff');

    // Scrub the handoff token (and any error flag) from the visible URL and
    // browser history before doing anything else.
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!handoff) {
      setError(
        describeGoogleAuthError(queryError) ||
          'Google sign-in did not complete. Please try again.'
      );
      return;
    }

    loginWithGoogle(handoff)
      .then(() => {
        navigate('/dashboard', { replace: true });
      })
      .catch((err: any) => {
        setError(
          err?.message ||
            'We could not complete Google sign-in. Please try again or use your email and password.'
        );
      });
  }, [loginWithGoogle, navigate]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl text-white flex items-center justify-center mx-auto shadow-xs">
          <Package className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Signing you in</h1>
        <p className="text-sm text-stone-500">Completing your Google sign-in securely.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs">
        {error ? (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <Link
              to="/login"
              replace
              className="block text-center w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying your account...</span>
          </div>
        )}
      </div>
    </div>
  );
};

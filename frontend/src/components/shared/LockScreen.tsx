import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api, ApiError } from '../../services/api';
import { deriveKey } from '../../services/crypto';

export default function LockScreen() {
  const { user, kdfSalt, unlock, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || !kdfSalt) return;
    setError('');
    setLoading(true);

    try {
      // Re-derive the encryption key from the entered password
      const key = await deriveKey(password, kdfSalt);

      // Refresh the access token (validates the session is still alive)
      const tokenData = await api.auth.refresh();

      unlock(tokenData.access_token, key);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Session expired — please sign in again.');
      } else {
        setError('Failed to unlock. Check your password and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await api.auth.logout();
    logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-sm mx-4"
      >
        <div
          className="rounded-2xl border border-[rgba(255,255,255,0.10)] p-8 shadow-2xl"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {/* Icon */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mb-4">
              <Shield size={22} className="text-accent-blue" />
            </div>
            <h1 className="text-lg font-semibold text-text-pri">Vault locked</h1>
            <p className="text-sm text-text-sec mt-1">
              Signed in as{' '}
              <span className="text-text-pri font-medium">{user?.username}</span>
            </p>
          </div>

          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            {/* Password input */}
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Master password"
                autoFocus
                autoComplete="current-password"
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-3 pr-11 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue focus:bg-[rgba(59,130,246,0.06)] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-ter hover:text-text-sec transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-accent-red text-xs bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-accent-blue hover:bg-accent-blue-h disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? 'Unlocking…' : 'Unlock'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleSignOut}
              className="text-xs text-text-ter hover:text-text-sec transition-colors"
            >
              Sign in with a different account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

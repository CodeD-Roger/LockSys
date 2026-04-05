import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api, ApiError } from '../services/api';
import { deriveKey } from '../services/crypto';
import StrengthBar from '../components/shared/StrengthBar';

type Mode = 'login' | 'register';

export default function Login() {
  // FIX 2 : lecture du token depuis le fragment hash (#token=…)
  // Le hash n'est JAMAIS envoyé au serveur → invisible dans les logs
  const inviteToken = (() => {
    const hash = window.location.hash.slice(1); // retire le '#'
    const params = new URLSearchParams(hash);
    return params.get('token') ?? undefined;
  })();

  const [mode, setMode] = useState<Mode>(inviteToken ? 'register' : 'login');
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();

  // Vérifie si c'est la première inscription (DB vide) ou si une invitation est requise
  useEffect(() => {
    api.auth.status().then((s) => setRegistrationOpen(s.registration_open));
  }, []);

  // Si un token d'invitation est dans l'URL, forcer le mode register
  useEffect(() => {
    if (inviteToken) setMode('register');
  }, [inviteToken]);

  const canShowRegister = registrationOpen === true || !!inviteToken;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data =
        mode === 'login'
          ? await api.auth.login(username.trim().toLowerCase(), password)
          : await api.auth.register(username.trim().toLowerCase(), password, inviteToken);

      const key = await deriveKey(password, data.kdf_salt);
      setAuth(data.user, data.access_token, data.kdf_salt, key);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-3 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue focus:bg-[rgba(59,130,246,0.06)] transition-colors';

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-blue flex items-center justify-center mb-4">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-text-pri">LockSys</h1>
          <p className="text-sm text-text-sec mt-1">Self-hosted password manager</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-[rgba(255,255,255,0.10)] p-6 shadow-2xl"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {/* Mode tabs — affiche "Créer un compte" seulement si autorisé */}
          {canShowRegister && (
            <div className="flex bg-[rgba(255,255,255,0.04)] rounded-lg p-0.5 mb-6">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError('');
                  }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-[rgba(255,255,255,0.08)] text-text-pri shadow-sm'
                      : 'text-text-ter hover:text-text-sec'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Message si inscription fermée et pas d'invitation */}
          {!canShowRegister && registrationOpen === false && (
            <div className="mb-5 text-xs text-text-ter text-center bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2">
              Account creation is restricted to administrators.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Username */}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              autoComplete="username"
              className={inputCls}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Master password (min. 12 chars)' : 'Master password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className={`${inputCls} pr-11 font-mono`}
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
              {mode === 'register' && password.length > 0 && (
                <StrengthBar password={password} showLabel />
              )}
            </div>

            {/* Affiche le token d'invitation si présent (lecture seule, pour info) */}
            {mode === 'register' && inviteToken && (
              <div className="flex items-center gap-2 text-xs text-text-ter bg-[rgba(59,130,246,0.06)] border border-accent-blue/20 rounded-lg px-3 py-2">
                <Shield size={12} className="shrink-0 text-accent-blue" />
                Invitation token applied
              </div>
            )}

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
              disabled={loading || !username || !password}
              className="w-full bg-accent-blue hover:bg-accent-blue-h disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors mt-1"
            >
              {loading
                ? mode === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-xs text-text-ter text-center leading-relaxed">
              Your master password is never sent to the server.
              <br />
              All entries are encrypted client-side before storage.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

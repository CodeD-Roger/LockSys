import { useState } from 'react';
import { Clock, Shield, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const LOCK_OPTIONS = [
  { label: '1 minute', value: 60_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '15 minutes', value: 900_000 },
  { label: '30 minutes', value: 1_800_000 },
  { label: '1 hour', value: 3_600_000 },
  { label: 'Never', value: 0 },
];

export default function Settings() {
  const { user } = useAuthStore();
  const [lockTimeout, setLockTimeout] = useState(300_000);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a future phase, persist this to backend settings_json
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectCls =
    'bg-[#1c1c1f] border border-[rgba(255,255,255,0.10)] rounded-lg px-3 py-2 text-sm text-text-pri focus:border-accent-blue transition-colors cursor-pointer';

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-pri">Settings</h1>
        <p className="text-sm text-text-sec mt-1">Preferences and security options</p>
      </div>

      {/* Account */}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-text-ter uppercase tracking-widest mb-3">Account</h2>
        <div
          className="rounded-xl border border-[rgba(255,255,255,0.08)] p-4"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <span className="text-accent-blue font-semibold">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-pri">{user?.username}</p>
              <p className="text-xs text-text-ter">
                Member since{' '}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-text-ter uppercase tracking-widest mb-3">Security</h2>
        <div
          className="rounded-xl border border-[rgba(255,255,255,0.08)] divide-y divide-[rgba(255,255,255,0.06)]"
          style={{ background: 'var(--bg-elevated)' }}
        >
          {/* Auto-lock */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Clock size={15} className="text-text-ter" />
              <div>
                <p className="text-sm text-text-pri">Auto-lock timeout</p>
                <p className="text-xs text-text-ter">Lock vault after inactivity</p>
              </div>
            </div>
            <select
              value={lockTimeout}
              onChange={(e) => setLockTimeout(Number(e.target.value))}
              className={selectCls}
            >
              {LOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Zero-knowledge notice */}
      <div className="rounded-xl border border-[rgba(59,130,246,0.2)] bg-accent-blue/5 p-4 mb-6">
        <div className="flex items-start gap-2.5">
          <Shield size={15} className="text-accent-blue mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-pri mb-1">Zero-knowledge architecture</p>
            <p className="text-xs text-text-sec leading-relaxed">
              Your master password and encryption keys never leave your device. All vault entries
              are encrypted client-side with AES-256-GCM before being stored. Even the server
              administrators cannot read your data.
            </p>
          </div>
        </div>
      </div>

      {/* Version */}
      <div className="flex items-center gap-2 text-xs text-text-ter">
        <Info size={12} />
        LockSys v1.0.0
      </div>

      <button
        onClick={handleSave}
        className="mt-5 px-4 py-2 rounded-lg bg-accent-blue hover:bg-accent-blue-h text-white text-sm font-medium transition-colors"
      >
        {saved ? 'Saved!' : 'Save settings'}
      </button>
    </div>
  );
}

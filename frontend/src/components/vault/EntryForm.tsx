import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, RefreshCw, X, Globe, FileText, CreditCard, FolderOpen } from 'lucide-react';
import type { EntryData } from '../../hooks/useVault';
import type { VaultResponse } from '../../services/api';
import StrengthBar from '../shared/StrengthBar';

interface Props {
  initial?: Partial<EntryData>;
  initialVaultId?: string;
  vaults?: VaultResponse[];           // Pour le sélecteur de dossier (création)
  onSubmit: (data: EntryData, vaultId?: string) => Promise<void>;
  onCancel: () => void;
  title?: string;
}

type EntryType = 'login' | 'note' | 'card';

const TYPES: { key: EntryType; label: string; icon: React.ElementType }[] = [
  { key: 'login', label: 'Login', icon: Globe },
  { key: 'note',  label: 'Note',  icon: FileText },
  { key: 'card',  label: 'Card',  icon: CreditCard },
];

function generatePassword(length = 20): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  const all = upper + lower + digits + symbols;
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const random = Array.from(
    window.crypto.getRandomValues(new Uint8Array(length - required.length)),
    (b) => all[b % all.length],
  );
  return [...required, ...random].sort(() => Math.random() - 0.5).join('');
}

const inputCls =
  'w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue focus:bg-[rgba(59,130,246,0.04)] transition-colors outline-none';

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-text-ter uppercase tracking-wider">{children}</label>;
}

export default function EntryForm({
  initial,
  initialVaultId,
  vaults,
  onSubmit,
  onCancel,
  title = 'New entry',
}: Props) {
  const [type, setType] = useState<EntryType>('login');
  const [selectedVaultId, setSelectedVaultId] = useState(
    initialVaultId ?? vaults?.[0]?.id ?? '',
  );
  const [form, setForm] = useState<EntryData>({
    title: initial?.title ?? '',
    username: initial?.username ?? '',
    password: initial?.password ?? '',
    url: initial?.url ?? '',
    notes: initial?.notes ?? '',
    is_favorite: initial?.is_favorite ?? false,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof EntryData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleGenerate = () => {
    setForm((f) => ({ ...f, password: generatePassword() }));
    setShowPw(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (vaults && !selectedVaultId) { setError('Please select a folder'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit(form, selectedVaultId || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!initial?.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full border-l border-[rgba(255,255,255,0.06)]"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <h2 className="font-semibold text-text-pri">{title}</h2>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-5">

          {/* Type selector — uniquement à la création */}
          {!isEditing && (
            <div className="flex gap-1 bg-[rgba(255,255,255,0.04)] rounded-xl p-1">
              {TYPES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    type === key
                      ? 'bg-[rgba(255,255,255,0.10)] text-text-pri shadow-sm'
                      : 'text-text-ter hover:text-text-sec'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Sélecteur de dossier — uniquement à la création depuis "All items" */}
          {!isEditing && vaults && vaults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>
                <span className="flex items-center gap-1"><FolderOpen size={11} className="inline" /> Folder</span>
              </Label>
              <select
                value={selectedVaultId}
                onChange={(e) => setSelectedVaultId(e.target.value)}
                className={inputCls}
              >
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label>Name <span className="text-accent-red normal-case">*</span></Label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              placeholder={type === 'login' ? 'e.g. GitHub' : type === 'note' ? 'Note title' : 'Card name'}
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Champs Login */}
          {type === 'login' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Username / Email</Label>
                <input
                  type="text"
                  value={form.username ?? ''}
                  onChange={set('username')}
                  placeholder="username or email"
                  className={inputCls}
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password ?? ''}
                    onChange={set('password')}
                    placeholder="password"
                    className={`${inputCls} pr-20 font-mono`}
                    autoComplete="new-password"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={handleGenerate}
                      className="p-1 rounded-lg text-text-ter hover:text-accent-blue hover:bg-accent-blue/10 transition-colors" title="Generate">
                      <RefreshCw size={13} />
                    </button>
                    <button type="button" onClick={() => setShowPw((s) => !s)}
                      className="p-1 rounded-lg text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                {form.password && <StrengthBar password={form.password} showLabel />}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Website URL</Label>
                <input
                  type="url"
                  value={form.url ?? ''}
                  onChange={set('url')}
                  placeholder="https://example.com"
                  className={inputCls}
                />
              </div>
            </>
          )}

          {/* Champs Card */}
          {type === 'card' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Card number</Label>
                <input type="text" value={form.username ?? ''} onChange={set('username')}
                  placeholder="•••• •••• •••• ••••" className={`${inputCls} font-mono`} autoComplete="off" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Expiry</Label>
                  <input type="text" value={form.url ?? ''} onChange={set('url')}
                    placeholder="MM/YY" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>CVV</Label>
                  <input type="password" value={form.password ?? ''} onChange={set('password')}
                    placeholder="•••" className={`${inputCls} font-mono`} autoComplete="off" />
                </div>
              </div>
            </>
          )}

          {/* Notes — toujours disponible pour login et note */}
          {(type === 'login' || type === 'note') && (
            <div className="flex flex-col gap-1.5">
              <Label>{type === 'note' ? 'Content' : 'Notes'}</Label>
              <textarea
                value={form.notes ?? ''}
                onChange={set('notes') as React.ChangeEventHandler<HTMLTextAreaElement>}
                placeholder={type === 'note' ? 'Write your note here…' : 'Optional notes…'}
                rows={type === 'note' ? 6 : 3}
                className={`${inputCls} resize-none`}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </form>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.10)] text-sm text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors">
          Cancel
        </button>
        <button type="submit" onClick={handleSubmit} disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-h disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </motion.div>
  );
}

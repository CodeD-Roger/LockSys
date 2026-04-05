import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ExternalLink, Edit2, Trash2, X, Star, FolderOpen } from 'lucide-react';
import type { DecryptedEntry } from '../../hooks/useVault';
import { useToggleFavorite } from '../../hooks/useVault';
import CopyButton from '../shared/CopyButton';
import StrengthBar from '../shared/StrengthBar';

interface Props {
  entry: DecryptedEntry;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function FieldRow({
  label,
  value,
  id,
  isPassword = false,
  isUrl = false,
  mono = false,
}: {
  label: string;
  value: string;
  id: string;
  isPassword?: boolean;
  isUrl?: boolean;
  mono?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = isPassword && !revealed ? '•'.repeat(Math.min(value.length, 28)) : value;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-ter uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5">
        <span className={`flex-1 text-sm text-text-pri truncate select-all ${mono ? 'font-mono' : ''}`}>
          {display}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="p-1 rounded-lg text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              title={revealed ? 'Hide' : 'Show'}
            >
              {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          {isUrl && (
            <a
              href={value.startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg text-text-ter hover:text-accent-blue hover:bg-[rgba(59,130,246,0.08)] transition-colors"
              title="Open URL"
            >
              <ExternalLink size={13} />
            </a>
          )}
          <CopyButton value={value} id={id} label={label} />
        </div>
      </div>
      {isPassword && revealed && value && (
        <div className="px-1">
          <StrengthBar password={value} showLabel />
        </div>
      )}
    </div>
  );
}

// Palette cohérente avec EntryCard
const AVATAR_COLORS = [
  '#3B82F6','#8B5CF6','#EC4899','#F59E0B',
  '#10B981','#EF4444','#06B6D4','#F97316',
  '#6366F1','#14B8A6',
];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function EntryDetail({ entry, onEdit, onDelete, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggleFavorite = useToggleFavorite();
  const data = entry.data;

  const title = data?.title ?? 'Unreadable entry';
  const avatarColor = getAvatarColor(title);
  const avatarChar = title.trim()[0]?.toUpperCase() ?? '?';
  const isFavorite = data?.is_favorite ?? false;

  const updatedAt = new Date(entry.updated_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <AnimatePresence>
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col h-full border-l border-[rgba(255,255,255,0.06)] relative"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ backgroundColor: avatarColor + '22', color: avatarColor, border: `1px solid ${avatarColor}33` }}
            >
              {avatarChar}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-text-pri truncate leading-tight">{title}</h2>
              {entry.vault_name && (
                <div className="flex items-center gap-1 mt-0.5">
                  <FolderOpen size={10} className="text-text-ter shrink-0" />
                  <span className="text-xs text-text-ter truncate">{entry.vault_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Favorite */}
            {data && (
              <button
                onClick={() => toggleFavorite.mutate(entry)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFavorite
                    ? 'text-amber-400 hover:bg-amber-400/10'
                    : 'text-text-ter hover:text-amber-400 hover:bg-[rgba(255,255,255,0.06)]'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-text-ter hover:text-accent-red hover:bg-accent-red/10 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!data ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <p className="text-text-sec text-sm">Unable to decrypt this entry.</p>
              <p className="text-text-ter text-xs">
                This may happen if the entry was encrypted with a different master password.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {data.username && (
                <FieldRow label="Username / Email" value={data.username} id={`${entry.id}-username`} />
              )}
              {data.password && (
                <FieldRow label="Password" value={data.password} id={`${entry.id}-password`} isPassword mono />
              )}
              {data.url && (
                <FieldRow label="Website" value={data.url} id={`${entry.id}-url`} isUrl />
              )}
              {data.notes && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-text-ter uppercase tracking-wider">Notes</span>
                  <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5">
                    <p className="text-sm text-text-pri whitespace-pre-wrap">{data.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-text-ter">Updated {updatedAt}</p>
        </div>

        {/* Delete confirmation overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 z-10 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm rounded-r-2xl">
            <div
              className="w-full max-w-xs rounded-2xl border border-[rgba(255,255,255,0.10)] p-5"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <p className="text-sm font-semibold text-text-pri mb-1">Delete «{title}»?</p>
              <p className="text-xs text-text-ter mb-4">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-xl border border-[rgba(255,255,255,0.10)] text-sm text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(); }}
                  className="flex-1 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

import { Star } from 'lucide-react';
import type { DecryptedEntry } from '../../hooks/useVault';
import { useToggleFavorite } from '../../hooks/useVault';
import CopyButton from '../shared/CopyButton';
import { getPasswordScore } from '../shared/StrengthBar';

interface Props {
  entry: DecryptedEntry;
  isSelected: boolean;
  onClick: () => void;
  showFolder?: boolean;
}

// Palette de couleurs déterministe par nom
const AVATAR_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#06B6D4', '#F97316',
  '#6366F1', '#14B8A6',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch { return null; }
}

const TYPE_LABEL: Record<string, string> = {
  login: '',
  note: 'Note',
  card: 'Card',
  identity: 'Identity',
};

const STRENGTH_COLOR: Record<number, string> = {
  0: '#EF4444', 1: '#EF4444', 2: '#F59E0B', 3: '#3B82F6', 4: '#10B981',
};

export default function EntryCard({ entry, isSelected, onClick, showFolder = false }: Props) {
  const toggleFavorite = useToggleFavorite();

  const title = entry.data?.title ?? '(unreadable)';
  const username = entry.data?.username ?? '';
  const password = entry.data?.password ?? '';
  const isFavorite = entry.data?.is_favorite ?? false;
  const domain = getDomain(entry.data?.url);
  const avatarChar = title.trim()[0]?.toUpperCase() ?? '?';
  const avatarColor = getAvatarColor(title);
  const typeLabel = TYPE_LABEL[entry.entry_type] ?? '';
  const score = password ? getPasswordScore(password) : -1;

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.data) toggleFavorite.mutate(entry);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl transition-all ${
        isSelected
          ? 'bg-accent-blue/10 border border-accent-blue/30'
          : 'border border-transparent hover:bg-[rgba(255,255,255,0.05)]'
      }`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-semibold shadow-sm"
        style={{ backgroundColor: avatarColor + '22', color: avatarColor, border: `1px solid ${avatarColor}33` }}
      >
        {avatarChar}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-pri truncate leading-tight">{title}</span>
          {typeLabel && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-text-ter font-medium">
              {typeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {username && (
            <span className="text-xs text-text-ter truncate">{username}</span>
          )}
          {domain && !username && (
            <span className="text-xs text-text-ter truncate">{domain}</span>
          )}
          {showFolder && entry.vault_name && (
            <span className="text-xs text-text-ter/60 shrink-0 truncate">· {entry.vault_name}</span>
          )}
        </div>
      </div>

      {/* Right side: strength dot + actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Password strength dot */}
        {score >= 0 && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: STRENGTH_COLOR[score] }}
            title={`Password strength: ${['Very weak','Weak','Fair','Good','Strong'][score]}`}
          />
        )}

        {/* Quick copy — visible on hover/selected */}
        {entry.data && (
          <div
            className={`flex items-center gap-0.5 transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {username && (
              <CopyButton value={username} id={`${entry.id}-user`} label="username" />
            )}
            {password && (
              <CopyButton value={password} id={`${entry.id}-pass`} label="password" />
            )}
          </div>
        )}

        {/* Favorite star */}
        {entry.data && (
          <button
            type="button"
            onClick={handleFavorite}
            className={`p-1 rounded-lg transition-all ${
              isFavorite
                ? 'text-amber-400'
                : 'text-transparent group-hover:text-text-ter hover:text-amber-400'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </button>
  );
}

import { Check, Copy } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';

interface Props {
  value: string;
  id: string;
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * Copy button that shows a 30-second countdown after copying.
 * Uses the shared clipboard hook — all CopyButtons on a page share the same
 * countdown state (only one value is in the clipboard at a time).
 */
export default function CopyButton({ value, id, label, size = 'sm' }: Props) {
  const { copy, copiedId, countdown } = useClipboard();
  const isCopied = copiedId === id;

  const iconSize = size === 'sm' ? 13 : 15;
  const cls =
    size === 'sm'
      ? 'p-1.5 rounded text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors'
      : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.10)] text-sm text-text-sec hover:text-text-pri hover:border-[rgba(255,255,255,0.16)] transition-colors';

  return (
    <button
      type="button"
      onClick={() => copy(value, id)}
      className={`${cls} ${isCopied ? 'text-accent-green!' : ''}`}
      title={isCopied ? `Clipboard clears in ${countdown}s` : `Copy ${label ?? ''}`}
    >
      {isCopied ? (
        <>
          <Check size={iconSize} className="text-accent-green" />
          {size === 'md' && (
            <span className="text-accent-green font-mono text-xs">{countdown}s</span>
          )}
        </>
      ) : (
        <>
          <Copy size={iconSize} />
          {size === 'md' && label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

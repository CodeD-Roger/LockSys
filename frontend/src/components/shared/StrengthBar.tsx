import zxcvbn from 'zxcvbn';

interface Props {
  password: string;
  showLabel?: boolean;
}

const LEVELS = [
  { label: 'Very weak', color: 'bg-accent-red' },
  { label: 'Weak', color: 'bg-accent-red' },
  { label: 'Fair', color: 'bg-accent-amber' },
  { label: 'Good', color: 'bg-accent-blue' },
  { label: 'Strong', color: 'bg-accent-green' },
];

/**
 * 4-segment strength bar powered by zxcvbn.
 * Score 0–4 maps to Very weak → Strong.
 */
export default function StrengthBar({ password, showLabel = false }: Props) {
  if (!password) return null;

  const { score } = zxcvbn(password);
  const { label, color } = LEVELS[score];
  const filled = score + 1; // 1–5 segments filled

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= filled ? color : 'bg-[rgba(255,255,255,0.08)]'
            }`}
          />
        ))}
      </div>
      {showLabel && (
        <span
          className={`text-xs font-medium ${
            score <= 1
              ? 'text-accent-red'
              : score === 2
              ? 'text-accent-amber'
              : score === 3
              ? 'text-accent-blue'
              : 'text-accent-green'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** Returns the zxcvbn score (0–4) for a password. */
export function getPasswordScore(password: string): number {
  return password ? zxcvbn(password).score : -1;
}

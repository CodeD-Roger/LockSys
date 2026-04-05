import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import StrengthBar from '../components/shared/StrengthBar';
import CopyButton from '../components/shared/CopyButton';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIGUOUS = /[0OIl1]/g;

const EFF_WORDS = [
  'abacus', 'above', 'absent', 'absorb', 'abstract', 'achieve', 'across', 'action',
  'active', 'actual', 'advice', 'afford', 'afraid', 'agency', 'agenda', 'agent',
  'agree', 'ahead', 'almost', 'alone', 'alpine', 'already', 'always', 'amount',
  'anchor', 'animal', 'answer', 'appear', 'apple', 'apply', 'arctic', 'around',
  'arrive', 'aspect', 'assist', 'attach', 'attack', 'attend', 'author', 'autumn',
  'avenue', 'avoid', 'awaken', 'bamboo', 'basket', 'battle', 'beacon', 'beauty',
  'became', 'before', 'behave', 'belong', 'beside', 'better', 'beyond', 'blight',
  'blossom', 'border', 'bottle', 'bottom', 'branch', 'bridge', 'bright', 'bring',
  'broken', 'budget', 'burden', 'button', 'candle', 'canyon', 'carpet', 'castle',
  'casual', 'caught', 'center', 'change', 'charge', 'choice', 'choose', 'circle',
];

function generate(opts: {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  noAmbiguous: boolean;
}): string {
  let pool = '';
  if (opts.upper) pool += opts.noAmbiguous ? UPPER.replace(AMBIGUOUS, '') : UPPER;
  if (opts.lower) pool += opts.noAmbiguous ? LOWER.replace(AMBIGUOUS, '') : LOWER;
  if (opts.digits) pool += opts.noAmbiguous ? DIGITS.replace(AMBIGUOUS, '') : DIGITS;
  if (opts.symbols) pool += SYMBOLS;
  if (!pool) pool = LOWER;

  const bytes = window.crypto.getRandomValues(new Uint8Array(opts.length * 2));
  const chars: string[] = [];
  for (const b of bytes) {
    if (chars.length >= opts.length) break;
    const c = pool[b % pool.length];
    if (c) chars.push(c);
  }
  return chars.join('');
}

function generatePassphrase(wordCount: number, separator: string): string {
  const indices = window.crypto.getRandomValues(new Uint32Array(wordCount));
  return Array.from(indices, (i) => EFF_WORDS[i % EFF_WORDS.length]).join(separator);
}

type Tab = 'password' | 'passphrase';

export default function Generator() {
  const [tab, setTab] = useState<Tab>('password');

  // Password options
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [noAmbiguous, setNoAmbiguous] = useState(false);

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');

  const [password, setPassword] = useState(() =>
    generate({ length: 20, upper: true, lower: true, digits: true, symbols: true, noAmbiguous: false }),
  );

  const refresh = useCallback(() => {
    if (tab === 'password') {
      setPassword(generate({ length, upper, lower, digits, symbols, noAmbiguous }));
    } else {
      setPassword(generatePassphrase(wordCount, separator));
    }
  }, [tab, length, upper, lower, digits, symbols, noAmbiguous, wordCount, separator]);

  const checkboxCls =
    'w-4 h-4 rounded border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.04)] accent-accent-blue cursor-pointer';
  const labelCls = 'flex items-center gap-2 text-sm text-text-sec cursor-pointer select-none';

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-pri">Generator</h1>
        <p className="text-sm text-text-sec mt-1">Create strong passwords and passphrases</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[rgba(255,255,255,0.04)] rounded-lg p-0.5 mb-5 w-fit">
        {(['password', 'passphrase'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t
                ? 'bg-[rgba(255,255,255,0.08)] text-text-pri'
                : 'text-text-ter hover:text-text-sec'
            }`}
          >
            {t === 'password' ? 'Password' : 'Passphrase'}
          </button>
        ))}
      </div>

      {/* Output */}
      <div
        className="rounded-xl border border-[rgba(255,255,255,0.10)] p-4 mb-5"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-3">
          <p className="flex-1 font-mono text-base text-text-pri break-all leading-relaxed">
            {password}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <CopyButton value={password} id="generated" label="Copy" size="md" />
            <button
              onClick={refresh}
              className="p-2 rounded-lg border border-[rgba(255,255,255,0.10)] text-text-sec hover:text-text-pri hover:border-[rgba(255,255,255,0.16)] transition-colors"
              title="Regenerate"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        {tab === 'password' && (
          <div className="mt-3">
            <StrengthBar password={password} showLabel />
          </div>
        )}
      </div>

      {/* Options */}
      <div
        className="rounded-xl border border-[rgba(255,255,255,0.08)] p-5"
        style={{ background: 'var(--bg-elevated)' }}
      >
        {tab === 'password' ? (
          <div className="flex flex-col gap-4">
            {/* Length slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-sec">Length</span>
                <span className="font-mono text-sm text-text-pri bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded">
                  {length}
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={128}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-accent-blue"
              />
              <div className="flex justify-between text-xs text-text-ter mt-1">
                <span>8</span>
                <span>128</span>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-2.5">
              <label className={labelCls}>
                <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className={checkboxCls} />
                Uppercase (A–Z)
              </label>
              <label className={labelCls}>
                <input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} className={checkboxCls} />
                Lowercase (a–z)
              </label>
              <label className={labelCls}>
                <input type="checkbox" checked={digits} onChange={(e) => setDigits(e.target.checked)} className={checkboxCls} />
                Numbers (0–9)
              </label>
              <label className={labelCls}>
                <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} className={checkboxCls} />
                Symbols
              </label>
              <label className={`${labelCls} col-span-2`}>
                <input type="checkbox" checked={noAmbiguous} onChange={(e) => setNoAmbiguous(e.target.checked)} className={checkboxCls} />
                Exclude ambiguous characters (0, O, I, l, 1)
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-sec">Word count</span>
                <span className="font-mono text-sm text-text-pri bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded">
                  {wordCount}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-accent-blue"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-sec">Separator</span>
              <input
                type="text"
                value={separator}
                onChange={(e) => setSeparator(e.target.value.slice(0, 3))}
                maxLength={3}
                className="w-16 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-2 py-1.5 text-sm text-text-pri text-center font-mono focus:border-accent-blue transition-colors"
              />
            </div>
          </div>
        )}

        <button
          onClick={refresh}
          className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-blue hover:bg-accent-blue-h text-white text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} />
          Generate
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Search, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface Props {
  onSearch?: (query: string) => void;
}

export default function TopBar({ onSearch }: Props) {
  const [query, setQuery] = useState('');
  const { lock } = useAuthStore();

  const handleLock = async () => {
    await api.auth.logout();
    lock();
  };

  return (
    <header
      className="flex items-center gap-4 px-6 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ter pointer-events-none"
        />
        <input
          type="search"
          placeholder="Search entries…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue focus:bg-[rgba(59,130,246,0.06)] transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Lock button */}
        <button
          onClick={handleLock}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-text-sec hover:text-accent-amber hover:border-accent-amber/40 transition-colors text-sm"
          title="Lock vault (auto-locks after inactivity)"
        >
          <Lock size={13} />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>
    </header>
  );
}

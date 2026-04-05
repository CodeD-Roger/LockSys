import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  FileText,
  CreditCard,
  Star,
  LogOut,
  Shield,
  ShieldCheck,
  Wand2,
  Settings,
  FolderOpen,
  FolderPlus,
  Layers,
  Trash2,
  Download,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAllEntries } from '../../hooks/useVault';
import { useInstallPWA } from '../../hooks/useInstallPWA';

// ─── Compteurs ─────────────────────────────────────────────────────────────────

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-auto text-[10px] tabular-nums text-text-ter bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
      {count}
    </span>
  );
}

// ─── NavItem générique ────────────────────────────────────────────────────────

function NavItem({
  to,
  icon: Icon,
  label,
  count,
  color,
  iconBg,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  count?: number;
  color?: string;
  iconBg?: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
          isActive
            ? 'bg-accent-blue/10 text-accent-blue'
            : 'text-text-sec hover:bg-[rgba(255,255,255,0.05)] hover:text-text-pri'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              iconBg ?? (isActive ? 'bg-accent-blue/20' : 'bg-[rgba(255,255,255,0.06)]')
            }`}
          >
            <Icon size={13} className={color ?? (isActive ? 'text-accent-blue' : 'text-text-ter')} />
          </div>
          <span className="flex-1 truncate">{label}</span>
          {count !== undefined && <Badge count={count} />}
        </>
      )}
    </NavLink>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-text-ter uppercase tracking-widest">
      {label}
    </p>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { canInstall, install } = useInstallPWA();

  const vaultsQuery = useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.vaults.list(),
    staleTime: 60_000,
  });
  const vaults = vaultsQuery.data ?? [];

  const { data: allEntries = [] } = useAllEntries();

  // Compteurs
  const totalCount = allEntries.length;
  const favCount = allEntries.filter((e) => e.data?.is_favorite).length;
  const loginCount = allEntries.filter((e) => e.entry_type === 'login').length;
  const noteCount = allEntries.filter((e) => e.entry_type === 'note').length;
  const cardCount = allEntries.filter((e) => e.entry_type === 'card').length;

  const createVault = useMutation({
    mutationFn: (name: string) => api.vaults.create({ name }),
    onSuccess: (vault) => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      navigate(`/vaults/${vault.id}`);
      setNewFolderMode(false);
      setNewFolderName('');
    },
  });

  const deleteVault = useMutation({
    mutationFn: (id: string) => api.vaults.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['all-entries'] });
      navigate('/dashboard');
    },
  });

  const handleCreateFolder = () => {
    const name = newFolderName.trim() || 'New folder';
    createVault.mutate(name);
  };

  const handleLogout = async () => {
    await api.auth.logout();
    logout();
    queryClient.clear();
  };

  const isFavoritesActive = location.pathname === '/dashboard' && location.search.includes('favorites=1');
  const isTypeActive = (type: string) =>
    location.pathname === '/dashboard' && location.search.includes(`type=${type}`);

  return (
    <aside
      className="w-56 shrink-0 flex flex-col border-r border-[rgba(255,255,255,0.06)]"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="w-7 h-7 rounded-lg bg-accent-blue flex items-center justify-center">
          <Shield size={14} className="text-white" />
        </div>
        <span className="font-semibold text-text-pri text-sm tracking-tight">LockSys</span>
      </div>

      {/* Navigation principale */}
      <div className="flex-1 overflow-y-auto px-2 py-2">

        {/* Vues principales */}
        <NavItem to="/dashboard" icon={Layers} label="All items" count={totalCount} />

        {/* Favorites — NavLink custom pour gérer le query param */}
        <NavLink
          to="/dashboard?favorites=1"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
            isFavoritesActive
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'text-text-sec hover:bg-[rgba(255,255,255,0.05)] hover:text-text-pri'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            isFavoritesActive ? 'bg-amber-400/20' : 'bg-[rgba(255,255,255,0.06)]'
          }`}>
            <Star size={13} className={isFavoritesActive ? 'text-amber-400' : 'text-text-ter'} fill={isFavoritesActive ? 'currentColor' : 'none'} />
          </div>
          <span className="flex-1">Favorites</span>
          <Badge count={favCount} />
        </NavLink>

        {/* Catégories */}
        <SectionHeader label="Categories" />

        {[
          { type: 'login', label: 'Logins', icon: Globe, count: loginCount, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { type: 'note',  label: 'Notes',  icon: FileText, count: noteCount, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { type: 'card',  label: 'Cards',  icon: CreditCard, count: cardCount, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        ].map(({ type, label, icon: Icon, count, color, bg }) => (
          <NavLink
            key={type}
            to={`/dashboard?type=${type}`}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
              isTypeActive(type)
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-sec hover:bg-[rgba(255,255,255,0.05)] hover:text-text-pri'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isTypeActive(type) ? 'bg-accent-blue/20' : bg}`}>
              <Icon size={13} className={isTypeActive(type) ? 'text-accent-blue' : color} />
            </div>
            <span className="flex-1">{label}</span>
            <Badge count={count} />
          </NavLink>
        ))}

        {/* Dossiers */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-text-ter uppercase tracking-widest">Folders</p>
          <button
            onClick={() => setNewFolderMode(true)}
            className="p-0.5 rounded text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            title="New folder"
          >
            <FolderPlus size={12} />
          </button>
        </div>

        {/* Champ création dossier inline */}
        {newFolderMode && (
          <div className="px-2 mb-1">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); }
              }}
              placeholder="Folder name…"
              autoFocus
              onBlur={() => { if (!newFolderName.trim()) { setNewFolderMode(false); setNewFolderName(''); } }}
              className="w-full bg-[rgba(255,255,255,0.06)] border border-accent-blue/40 rounded-lg px-2.5 py-1.5 text-xs text-text-pri placeholder-text-ter outline-none"
            />
          </div>
        )}

        {/* Liste des dossiers */}
        <div className="flex flex-col gap-0.5">
          {vaults.map((v) => {
            const entryCount = allEntries.filter((e) => e.vault_id === v.id).length;
            const isActive = location.pathname === `/vaults/${v.id}`;
            return (
              <div key={v.id} className="group flex items-center">
                <NavLink
                  to={`/vaults/${v.id}`}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all min-w-0 ${
                    isActive
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-text-sec hover:bg-[rgba(255,255,255,0.05)] hover:text-text-pri'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-accent-blue/20' : 'bg-[rgba(255,255,255,0.06)]'
                  }`}>
                    <FolderOpen size={12} className={isActive ? 'text-accent-blue' : 'text-text-ter'} />
                  </div>
                  <span className="flex-1 truncate text-sm">{v.name}</span>
                  <Badge count={entryCount} />
                </NavLink>
                {/* Supprimer dossier */}
                <button
                  onClick={() => deleteVault.mutate(v.id)}
                  className="p-1 mr-1 rounded text-transparent group-hover:text-text-ter hover:!text-accent-red transition-colors shrink-0"
                  title="Delete folder"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
          {vaults.length === 0 && !newFolderMode && (
            <p className="px-3 py-2 text-xs text-text-ter">No folders yet</p>
          )}
        </div>

        {/* Outils */}
        <SectionHeader label="Tools" />
        <NavItem to="/generator" icon={Wand2} label="Generator" />
        <NavItem to="/settings" icon={Settings} label="Settings" />
        {user?.is_admin && (
          <NavItem to="/admin" icon={ShieldCheck} label="Administration" color="text-accent-blue" />
        )}

        {/* Install PWA — visible uniquement quand le navigateur propose l'installation */}
        {canInstall && (
          <button
            onClick={install}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.05)] transition-all"
            title="Install LockSys as a desktop app"
          >
            <div className="w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0">
              <Download size={12} />
            </div>
            <span className="flex-1 text-left">Install app</span>
          </button>
        )}
      </div>

      {/* Footer utilisateur */}
      <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center shrink-0">
            <span className="text-accent-blue text-xs font-semibold">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-sec truncate">{user?.username}</p>
            {user?.is_admin && <p className="text-[10px] text-accent-blue">Admin</p>}
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-text-ter hover:text-accent-red transition-colors"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

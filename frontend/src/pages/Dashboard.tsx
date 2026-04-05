import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Globe, FileText, CreditCard, Star } from 'lucide-react';
import { useAllEntries, useVaults, useVaultEntries } from '../hooks/useVault';
import type { DecryptedEntry, EntryData } from '../hooks/useVault';
import EntryCard from '../components/vault/EntryCard';
import EntryDetail from '../components/vault/EntryDetail';
import EntryForm from '../components/vault/EntryForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { encryptData } from '../services/crypto';
import { useAuthStore } from '../store/authStore';

type Panel = 'detail' | 'create' | 'edit' | null;

type TypeFilter = 'all' | 'login' | 'note' | 'card';

const TYPE_FILTERS: { key: TypeFilter; label: string; icon: React.ElementType }[] = [
  { key: 'all',   label: 'All',    icon: () => null },
  { key: 'login', label: 'Logins', icon: Globe },
  { key: 'note',  label: 'Notes',  icon: FileText },
  { key: 'card',  label: 'Cards',  icon: CreditCard },
];

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const favoritesOnly = searchParams.get('favorites') === '1';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedEntry, setSelectedEntry] = useState<DecryptedEntry | null>(null);

  const { cryptoKey } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: allEntries = [], isLoading } = useAllEntries();
  const { data: vaults = [] } = useVaults();

  // Réutilise les mutations du hook pour le vault de l'entrée sélectionnée
  const { updateEntry, deleteEntry } = useVaultEntries(selectedEntry?.vault_id);

  // Création depuis "All items" — nécessite un vaultId choisi dans le formulaire
  const { cryptoKey: ck } = useAuthStore();
  const createEntry = useMutation({
    mutationFn: async ({ data, vaultId }: { data: EntryData; vaultId: string }) => {
      if (!ck) throw new Error('Vault is locked');
      const { encrypted, iv } = await encryptData(JSON.stringify(data), ck);
      return api.entries.create(vaultId, { encrypted_data: encrypted, iv, entry_type: 'login' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-entries'] });
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
    },
  });

  // Filtrage
  const filtered = allEntries.filter((e) => {
    if (favoritesOnly && !e.data?.is_favorite) return false;
    if (typeFilter !== 'all' && e.entry_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.data?.title?.toLowerCase().includes(q) ||
        e.data?.username?.toLowerCase().includes(q) ||
        e.data?.url?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = async (data: EntryData, vaultId?: string) => {
    if (!vaultId) return;
    await createEntry.mutateAsync({ data, vaultId });
    setPanel(null);
  };

  const handleUpdate = async (data: EntryData) => {
    if (!selectedEntry) return;
    await updateEntry.mutateAsync({ id: selectedEntry.id, data });
    setSelectedEntry((prev) => prev ? { ...prev, data } : null);
    setPanel('detail');
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    await deleteEntry.mutateAsync(selectedEntry.id);
    setSelectedEntry(null);
    setPanel(null);
  };

  const openEntry = (entry: DecryptedEntry) => {
    setSelectedEntry(entry);
    setPanel('detail');
  };

  const showPanel = panel !== null || selectedEntry !== null;

  const pageTitle = favoritesOnly ? 'Favorites' : 'All items';
  const emptyMsg = favoritesOnly
    ? 'No favorites yet — star an entry to add it here.'
    : typeFilter !== 'all'
    ? 'No entries of this type.'
    : 'No entries yet.';

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      {/* Liste */}
      <div className={`flex flex-col ${showPanel ? 'w-80 shrink-0' : 'flex-1'} min-w-0`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h1 className="font-semibold text-text-pri text-sm flex items-center gap-2">
            {favoritesOnly && <Star size={14} className="text-amber-400" fill="currentColor" />}
            {pageTitle}
            {!isLoading && (
              <span className="text-xs font-normal text-text-ter">
                {filtered.length}
              </span>
            )}
          </h1>
          <button
            onClick={() => { setSelectedEntry(null); setPanel('create'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue-h text-white text-xs font-medium transition-colors shrink-0"
          >
            <Plus size={13} />
            New
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ter pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-3 py-2 text-xs text-text-pri placeholder-text-ter focus:border-accent-blue transition-colors outline-none"
            />
          </div>
        </div>

        {/* Type filter — masqué en mode Favorites */}
        {!favoritesOnly && (
          <div className="flex gap-1 px-3 py-2 border-b border-[rgba(255,255,255,0.06)] overflow-x-auto">
            {TYPE_FILTERS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  typeFilter === key
                    ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/25'
                    : 'text-text-ter hover:text-text-sec hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
                }`}
              >
                {key !== 'all' && <Icon size={11} />}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex flex-col gap-1 p-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse bg-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
              {favoritesOnly ? (
                <Star size={24} className="text-text-ter" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                  <Plus size={18} className="text-text-ter" />
                </div>
              )}
              <p className="text-sm text-text-ter">{emptyMsg}</p>
              {!favoritesOnly && !search && (
                <button
                  onClick={() => setPanel('create')}
                  className="text-xs text-accent-blue hover:underline"
                >
                  Add your first entry
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 group">
              {filtered.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedEntry?.id === entry.id}
                  onClick={() => openEntry(entry)}
                  showFolder
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panneau droit */}
      {showPanel && (
        <div className="flex-1 relative overflow-hidden">
          {panel === 'detail' && selectedEntry && (
            <EntryDetail
              entry={selectedEntry}
              onEdit={() => setPanel('edit')}
              onDelete={handleDelete}
              onClose={() => { setSelectedEntry(null); setPanel(null); }}
            />
          )}
          {panel === 'create' && (
            <EntryForm
              vaults={vaults}
              onSubmit={handleCreate}
              onCancel={() => setPanel(null)}
              title="New entry"
            />
          )}
          {panel === 'edit' && selectedEntry?.data && (
            <EntryForm
              initial={selectedEntry.data}
              onSubmit={handleUpdate}
              onCancel={() => setPanel('detail')}
              title="Edit entry"
            />
          )}
        </div>
      )}
    </div>
  );
}

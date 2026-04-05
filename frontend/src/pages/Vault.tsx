import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, FolderOpen, Pencil, Check, X } from 'lucide-react';
import { useVaultEntries, useVaults } from '../hooks/useVault';
import type { DecryptedEntry, EntryData } from '../hooks/useVault';
import EntryCard from '../components/vault/EntryCard';
import EntryDetail from '../components/vault/EntryDetail';
import EntryForm from '../components/vault/EntryForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

type Panel = 'detail' | 'create' | 'edit' | null;

export default function Vault() {
  const { vaultId } = useParams<{ vaultId: string }>();
  const [selectedEntry, setSelectedEntry] = useState<DecryptedEntry | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [search, setSearch] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const queryClient = useQueryClient();
  const { entriesQuery, createEntry, updateEntry, deleteEntry } = useVaultEntries(vaultId);
  const { data: vaults = [] } = useVaults();

  const vaultQuery = useQuery({
    queryKey: ['vaults', vaultId],
    queryFn: () => api.vaults.get(vaultId!),
    enabled: !!vaultId,
  });

  const renameVault = useMutation({
    mutationFn: (name: string) => api.vaults.update(vaultId!, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      queryClient.invalidateQueries({ queryKey: ['vaults', vaultId] });
      setEditingName(false);
    },
  });

  const folderName = vaultQuery.data?.name ?? 'Folder';

  const startEdit = () => {
    setNameInput(folderName);
    setEditingName(true);
  };

  const confirmRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== folderName) renameVault.mutate(trimmed);
    else setEditingName(false);
  };

  const entries = entriesQuery.data ?? [];
  const filtered = entries.filter((e) =>
    !search ||
    e.data?.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.data?.username?.toLowerCase().includes(search.toLowerCase()) ||
    e.data?.url?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async (data: EntryData) => {
    await createEntry.mutateAsync({ vaultId: vaultId!, data });
    setPanel(null);
  };

  const handleUpdate = async (data: EntryData) => {
    if (!selectedEntry) return;
    await updateEntry.mutateAsync({ id: selectedEntry.id, data });
    setPanel('detail');
    setSelectedEntry((prev) => prev ? { ...prev, data } : null);
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    await deleteEntry.mutateAsync(selectedEntry.id);
    setSelectedEntry(null);
    setPanel(null);
  };

  const showPanel = panel !== null || selectedEntry !== null;

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      {/* Liste */}
      <div className={`flex flex-col ${showPanel ? 'w-80 shrink-0' : 'flex-1'} min-w-0`}>

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen size={15} className="text-text-ter shrink-0" />
            {editingName ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="flex-1 min-w-0 bg-[rgba(255,255,255,0.06)] border border-accent-blue/50 rounded-lg px-2 py-1 text-sm text-text-pri outline-none"
                  autoFocus
                />
                <button onClick={confirmRename}
                  className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors">
                  <Check size={13} />
                </button>
                <button onClick={() => setEditingName(false)}
                  className="p-1 rounded text-text-ter hover:text-text-sec transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-semibold text-text-pri truncate text-sm">{folderName}</h1>
                <button onClick={startEdit}
                  className="p-1 rounded text-text-ter hover:text-text-sec opacity-0 group-hover:opacity-100 transition-all hover:bg-[rgba(255,255,255,0.06)]"
                  title="Rename folder">
                  <Pencil size={11} />
                </button>
              </div>
            )}
          </div>
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
              placeholder="Search in this folder…"
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-xl pl-8 pr-3 py-2 text-xs text-text-pri placeholder-text-ter focus:border-accent-blue transition-colors outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {entriesQuery.isLoading ? (
            <div className="flex flex-col gap-1 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse bg-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <p className="text-sm text-text-ter">
                {search ? 'No matching entries' : 'This folder is empty'}
              </p>
              {!search && (
                <button onClick={() => setPanel('create')} className="text-xs text-accent-blue hover:underline">
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
                  onClick={() => { setSelectedEntry(entry); setPanel('detail'); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-text-ter">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </p>
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
              onSubmit={handleCreate}
              onCancel={() => setPanel(null)}
              title={`New entry in ${folderName}`}
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type EntryResponse, type VaultResponse } from '../services/api';
import { decryptData, encryptData } from '../services/crypto';
import { useAuthStore } from '../store/authStore';

export interface EntryData {
  title: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  is_favorite?: boolean;
}

export interface DecryptedEntry extends EntryResponse {
  /** Null when decryption fails (wrong key or corrupt data) */
  data: EntryData | null;
  /** Name of the folder this entry belongs to */
  vault_name: string;
}

// ─── Vaults (Folders) ─────────────────────────────────────────────────────────

export function useVaults() {
  return useQuery({
    queryKey: ['vaults'],
    queryFn: () => api.vaults.list(),
    staleTime: 60_000,
  });
}

// ─── All entries across all folders ──────────────────────────────────────────

async function decryptEntries(
  raw: EntryResponse[],
  vault: VaultResponse,
  cryptoKey: CryptoKey,
): Promise<DecryptedEntry[]> {
  return Promise.all(
    raw.map(async (entry): Promise<DecryptedEntry> => {
      try {
        const plaintext = await decryptData(entry.encrypted_data, entry.iv, cryptoKey);
        return { ...entry, data: JSON.parse(plaintext) as EntryData, vault_name: vault.name };
      } catch {
        return { ...entry, data: null, vault_name: vault.name };
      }
    }),
  );
}

export function useAllEntries() {
  const { cryptoKey } = useAuthStore();
  const { data: vaults } = useVaults();

  return useQuery({
    queryKey: ['all-entries', vaults?.map((v) => v.id)],
    queryFn: async (): Promise<DecryptedEntry[]> => {
      if (!vaults || !cryptoKey) return [];

      const perVault = await Promise.all(
        vaults.map(async (vault) => {
          const raw = await api.entries.list(vault.id);
          return decryptEntries(raw, vault, cryptoKey);
        }),
      );

      return perVault
        .flat()
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    },
    enabled: !!cryptoKey && !!vaults,
    staleTime: 30_000,
  });
}

// ─── Single folder entries ────────────────────────────────────────────────────

export function useVaultEntries(vaultId: string | undefined) {
  const { cryptoKey } = useAuthStore();
  const { data: vaults } = useVaults();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ['entries', vaultId],
    queryFn: async (): Promise<DecryptedEntry[]> => {
      if (!vaultId || !cryptoKey) return [];
      const vault = vaults?.find((v) => v.id === vaultId);
      const raw = await api.entries.list(vaultId);
      return decryptEntries(raw, vault ?? { id: vaultId, name: 'Folder', owner_id: '', is_shared: false, created_at: '', entry_count: 0 }, cryptoKey);
    },
    enabled: !!cryptoKey && !!vaultId,
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entries', vaultId] });
    queryClient.invalidateQueries({ queryKey: ['all-entries'] });
    queryClient.invalidateQueries({ queryKey: ['vaults'] });
  };

  const createEntry = useMutation({
    mutationFn: async ({
      vaultId: vid,
      data,
      entryType = 'login',
    }: {
      vaultId: string;
      data: EntryData;
      entryType?: string;
    }) => {
      if (!cryptoKey) throw new Error('Vault is locked');
      const { encrypted, iv } = await encryptData(JSON.stringify(data), cryptoKey);
      return api.entries.create(vid, { encrypted_data: encrypted, iv, entry_type: entryType });
    },
    onSuccess: invalidate,
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EntryData }) => {
      if (!cryptoKey) throw new Error('Vault is locked');
      const { encrypted, iv } = await encryptData(JSON.stringify(data), cryptoKey);
      return api.entries.update(id, { encrypted_data: encrypted, iv });
    },
    onSuccess: invalidate,
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => api.entries.delete(id),
    onSuccess: invalidate,
  });

  return { entriesQuery, createEntry, updateEntry, deleteEntry };
}

// ─── Toggle favorite (works from any context) ─────────────────────────────────

export function useToggleFavorite() {
  const { cryptoKey } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: DecryptedEntry) => {
      if (!cryptoKey || !entry.data) throw new Error('Cannot update entry');
      const updated: EntryData = { ...entry.data, is_favorite: !entry.data.is_favorite };
      const { encrypted, iv } = await encryptData(JSON.stringify(updated), cryptoKey);
      return api.entries.update(entry.id, { encrypted_data: encrypted, iv });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-entries'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

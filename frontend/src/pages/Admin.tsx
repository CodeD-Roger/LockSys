import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Mail,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Link,
} from 'lucide-react';
import { api, AdminUserResponse, InviteTokenResponse } from '../services/api';
import { useAuthStore } from '../store/authStore';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}

// ─── Modal générique ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.10)] shadow-2xl p-6"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text-pri">{title}</h2>
          <button onClick={onClose} className="text-text-ter hover:text-text-sec transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Modal Créer un compte ─────────────────────────────────────────────────────

type CreateMode = 'direct' | 'invite';

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [createMode, setCreateMode] = useState<CreateMode>('direct');

  // Option A
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Option B
  const [expiryDays, setExpiryDays] = useState(7);
  const [inviteResult, setInviteResult] = useState<InviteTokenResponse | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const createDirectMutation = useMutation({
    mutationFn: () => api.admin.createUser({ username: username.trim().toLowerCase(), password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessInfo({ username: username.trim().toLowerCase(), password });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: () => api.admin.createInvite(expiryDays),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      setInviteResult(data);
    },
  });

  // FIX 2 : fragment hash (#token=…) — jamais envoyé au serveur ni logué
  const inviteUrl = inviteResult
    ? `${window.location.origin}/register#token=${inviteResult.token}`
    : '';

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const copyCredentials = () => {
    if (!successInfo) return;
    navigator.clipboard.writeText(`Username: ${successInfo.username}\nPassword: ${successInfo.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const error = createDirectMutation.error || createInviteMutation.error;
  const errorMsg = error instanceof Error ? error.message : null;

  return (
    <Modal title="Create account" onClose={onClose}>
      {/* Tabs */}
      <div className="flex bg-[rgba(255,255,255,0.04)] rounded-lg p-0.5 mb-5">
        {([
          { key: 'direct', icon: UserPlus, label: 'Direct' },
          { key: 'invite', icon: Mail, label: 'Invite link' },
        ] as { key: CreateMode; icon: React.ElementType; label: string }[]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setCreateMode(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
              createMode === key
                ? 'bg-[rgba(255,255,255,0.08)] text-text-pri shadow-sm'
                : 'text-text-ter hover:text-text-sec'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Option A : Compte direct ── */}
      {createMode === 'direct' && !successInfo && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-ter">
            Create the account with a temporary password. Share the credentials with the user outside the app.
          </p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-2.5 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue transition-colors"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password (min. 12 chars)"
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-2.5 pr-11 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-ter hover:text-text-sec transition-colors"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errorMsg && (
            <p className="text-xs text-accent-red">{errorMsg}</p>
          )}
          <button
            disabled={!username || !password || createDirectMutation.isPending}
            onClick={() => createDirectMutation.mutate()}
            className="w-full bg-accent-blue hover:bg-accent-blue-h disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {createDirectMutation.isPending ? 'Creating…' : 'Create account'}
          </button>
        </div>
      )}

      {/* ── Option A : Résultat ── */}
      {createMode === 'direct' && successInfo && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <Check size={15} />
            Account created successfully
          </div>
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 flex flex-col gap-1 font-mono text-sm">
            <span className="text-text-ter text-xs mb-1">Credentials to share (shown once)</span>
            <span className="text-text-pri">Username: <strong>{successInfo.username}</strong></span>
            <span className="text-text-pri">Password: <strong>{successInfo.password}</strong></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCredentials}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm text-text-sec hover:text-text-pri border border-[rgba(255,255,255,0.10)] rounded-lg py-2 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy credentials'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-accent-blue hover:bg-accent-blue-h text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Option B : Invite ── */}
      {createMode === 'invite' && !inviteResult && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-ter">
            Generate a one-time invitation link. The user chooses their own username and password.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">Expires in</label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-2.5 text-sm text-text-pri focus:border-accent-blue transition-colors"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          {errorMsg && (
            <p className="text-xs text-accent-red">{errorMsg}</p>
          )}
          <button
            disabled={createInviteMutation.isPending}
            onClick={() => createInviteMutation.mutate()}
            className="w-full bg-accent-blue hover:bg-accent-blue-h disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {createInviteMutation.isPending ? 'Generating…' : 'Generate link'}
          </button>
        </div>
      )}

      {/* ── Option B : Résultat ── */}
      {createMode === 'invite' && inviteResult && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <Check size={15} />
            Invitation link generated
          </div>
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-3">
            <p className="text-xs text-text-ter mb-2">Share this link (valid until {formatDate(inviteResult.expires_at)})</p>
            <p className="text-xs text-text-sec font-mono break-all">{inviteUrl}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyInvite}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm text-text-sec hover:text-text-pri border border-[rgba(255,255,255,0.10)] rounded-lg py-2 transition-colors"
            >
              {inviteCopied ? <Check size={13} className="text-emerald-400" /> : <Link size={13} />}
              {inviteCopied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-accent-blue hover:bg-accent-blue-h text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Modal Éditer un compte ───────────────────────────────────────────────────

function EditUserModal({ user, onClose }: { user: AdminUserResponse; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.admin.updateUser(user.id, {
        username: username !== user.username ? username : undefined,
        password: password || undefined,
        // FIX 7 : confirme explicitement la perte de données si mot de passe changé
        confirm_data_loss: !!password,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  const errorMsg = mutation.error instanceof Error ? mutation.error.message : null;
  const hasChanges = username !== user.username || password.length > 0;

  return (
    <Modal title={`Edit — ${user.username}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sec">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-2.5 text-sm text-text-pri focus:border-accent-blue transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sec">New password <span className="text-text-ter">(leave empty to keep current)</span></label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min. 12 chars)"
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-2.5 pr-11 text-sm text-text-pri placeholder-text-ter focus:border-accent-blue transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-ter hover:text-text-sec transition-colors"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {password && (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle size={11} />
              Resetting the password will make the user's existing vault entries inaccessible.
            </p>
          )}
        </div>

        {errorMsg && <p className="text-xs text-accent-red">{errorMsg}</p>}

        <div className="flex gap-2 mt-1">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-text-sec hover:text-text-pri border border-[rgba(255,255,255,0.10)] rounded-lg py-2.5 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!hasChanges || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 bg-accent-blue hover:bg-accent-blue-h disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal Supprimer / Désactiver ─────────────────────────────────────────────

function DeleteUserModal({ user, onClose }: { user: AdminUserResponse; onClose: () => void }) {
  const queryClient = useQueryClient();
  // FIX 16 : username confirmation before permanent deletion
  const [confirmInput, setConfirmInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deactivateMutation = useMutation({
    mutationFn: () => api.admin.deactivateUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.admin.deleteUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  const error = deactivateMutation.error || deleteMutation.error;
  const errorMsg = error instanceof Error ? error.message : null;
  const isPending = deactivateMutation.isPending || deleteMutation.isPending;
  const deleteConfirmed = confirmInput === user.username;

  if (showDeleteConfirm) {
    return (
      <Modal title="Confirm permanent deletion" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/5">
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">
              This will permanently delete <strong>{user.username}</strong> and all their vaults and entries.
              This action cannot be undone.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">
              Type <span className="font-mono text-text-pri">{user.username}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={user.username}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] rounded-lg px-4 py-2.5 text-sm text-text-pri placeholder-text-ter focus:border-accent-red transition-colors font-mono"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && deleteConfirmed && deleteMutation.mutate()}
            />
          </div>
          {errorMsg && <p className="text-xs text-accent-red">{errorMsg}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowDeleteConfirm(false); setConfirmInput(''); }}
              className="flex-1 text-sm text-text-sec hover:text-text-pri border border-[rgba(255,255,255,0.10)] rounded-lg py-2.5 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!deleteConfirmed || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Manage — ${user.username}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-sec">What do you want to do with this account?</p>

        {/* Désactiver */}
        <button
          disabled={isPending || !user.is_active}
          onClick={() => deactivateMutation.mutate()}
          className="w-full flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
        >
          <ShieldOff size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              {deactivateMutation.isPending ? 'Disabling…' : 'Disable account'}
            </p>
            <p className="text-xs text-text-ter mt-0.5">
              The user can no longer sign in. Their vaults and entries are preserved.
            </p>
          </div>
        </button>

        {/* Supprimer — ouvre le dialog de confirmation */}
        <button
          disabled={isPending}
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-start gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
        >
          <Trash2 size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Delete permanently</p>
            <p className="text-xs text-text-ter mt-0.5">
              Removes the account and all associated vaults and entries. This is irreversible.
            </p>
          </div>
        </button>

        {errorMsg && <p className="text-xs text-accent-red">{errorMsg}</p>}

        <button
          onClick={onClose}
          className="text-sm text-text-ter hover:text-text-sec transition-colors text-center py-1"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─── Tableau invitations ──────────────────────────────────────────────────────

function InvitesSection() {
  const queryClient = useQueryClient();
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => api.admin.listInvites(),
  });

  const revokeMutation = useMutation({
    mutationFn: (token: string) => api.admin.revokeInvite(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-invites'] }),
  });

  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyLink = (token: string) => {
    // FIX 2 : fragment hash — non loggé côté serveur
    navigator.clipboard.writeText(`${window.location.origin}/register#token=${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (isLoading) return <p className="text-xs text-text-ter px-1">Loading…</p>;
  if (invites.length === 0) return <p className="text-xs text-text-ter px-1">No pending invitations.</p>;

  return (
    <div className="flex flex-col gap-2">
      {invites.map((inv) => (
        <div
          key={inv.token}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]"
        >
          <div className="min-w-0">
            <p className="text-xs font-mono text-text-sec truncate">{inv.token.slice(0, 16)}…</p>
            <p className="text-xs text-text-ter mt-0.5">Expires {formatDate(inv.expires_at)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => copyLink(inv.token)}
              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-text-ter hover:text-text-sec transition-colors"
              title="Copy invite link"
            >
              {copiedToken === inv.token ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            <button
              onClick={() => revokeMutation.mutate(inv.token)}
              disabled={revokeMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-text-ter hover:text-accent-red transition-colors"
              title="Revoke"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Admin() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.admin.listUsers(),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.admin.activateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserResponse | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUserResponse | null>(null);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-pri">Administration</h1>
          <p className="text-sm text-text-ter mt-0.5">{users.length} account{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent-blue hover:bg-accent-blue-h text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <UserPlus size={14} />
          Create account
        </button>
      </div>

      {/* Tableau utilisateurs */}
      <div>
        <h2 className="text-xs font-medium text-text-ter uppercase tracking-widest mb-3">Users</h2>
        {isLoading ? (
          <p className="text-sm text-text-ter">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[rgba(59,130,246,0.15)] flex items-center justify-center shrink-0">
                  <span className="text-accent-blue text-sm font-semibold">
                    {user.username[0].toUpperCase()}
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-pri truncate">{user.username}</span>
                    {user.is_admin && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 font-medium">
                        <ShieldCheck size={10} />
                        Admin
                      </span>
                    )}
                    <StatusBadge active={user.is_active} />
                  </div>
                  <p className="text-xs text-text-ter mt-0.5">
                    Created {formatDate(user.created_at)}
                    {user.last_login && ` · Last login ${formatDate(user.last_login)}`}
                  </p>
                </div>

                {/* Actions — masquées pour le compte admin courant */}
                {user.id !== currentUser?.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Réactiver si désactivé */}
                    {!user.is_active && (
                      <button
                        onClick={() => activateMutation.mutate(user.id)}
                        disabled={activateMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-text-ter hover:text-emerald-400 transition-colors"
                        title="Activate account"
                      >
                        <ShieldCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setEditUser(user)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-text-ter hover:text-text-sec transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteUser(user)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-text-ter hover:text-accent-red transition-colors"
                      title="Disable / Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Indicateur pour le compte courant */}
                {user.id === currentUser?.id && (
                  <span className="text-xs text-text-ter shrink-0">You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section invitations */}
      <div>
        <h2 className="text-xs font-medium text-text-ter uppercase tracking-widest mb-3">Pending invitations</h2>
        <InvitesSection />
      </div>

      {/* Modals */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
      {deleteUser && <DeleteUserModal user={deleteUser} onClose={() => setDeleteUser(null)} />}
    </div>
  );
}

import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { api } from './services/api';

import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LockScreen from './components/shared/LockScreen';
import { useAutoLock } from './hooks/useAutoLock';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Generator from './pages/Generator';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppShell() {
  useAutoLock();

  const { isLocked } = useAuthStore();

  return (
    <div className="flex h-full">
      {isLocked && <LockScreen />}

      <Sidebar />

      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-200 ${
          isLocked ? 'blur-sm pointer-events-none select-none' : ''
        }`}
      >
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vaults/:vaultId" element={<Vault />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, isInitializing, setUserFromRefresh, setInitializing } = useAuthStore();

  useEffect(() => {
    api.auth
      .refresh()
      .then((data) => {
        setUserFromRefresh(data.user, data.access_token, data.kdf_salt);
      })
      .catch(() => {
        setInitializing(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-text-sec text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AppShell />;
}

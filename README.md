# LockSys

Self-hosted, zero-knowledge password manager. Runs entirely on localhost — no cloud, no telemetry, no external requests.

> **First account created = administrator.** Subsequent accounts can only be created by the admin from the Administration panel.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Quick start — without Docker](#quick-start--without-docker)
   - [Windows (PowerShell)](#windows-powershell)
   - [macOS (Bash / Zsh)](#macos-bash--zsh)
   - [Linux (Bash)](#linux-bash)
3. [Quick start — with Docker](#quick-start--with-docker)
4. [First run](#first-run)
5. [Install as desktop app (PWA)](#install-as-desktop-app-pwa)
6. [Managing users (admin)](#managing-users-admin)
7. [Stopping the app](#stopping-the-app)
8. [Backup & restore](#backup--restore)
9. [Troubleshooting](#troubleshooting)
10. [Configuration reference](#configuration-reference)
11. [Security model](#security-model)
12. [Project structure](#project-structure)

---

## Prerequisites

| Tool | Min. version | Check | Download |
|---|---|---|---|
| Python | 3.11+ | `python --version` | https://python.org/downloads |
| Node.js | 18+ | `node --version` | https://nodejs.org |
| Git | any | `git --version` | https://git-scm.com |
| Docker *(optional)* | 24+ | `docker --version` | https://docker.com/products/docker-desktop |

---

## Quick start — without Docker

> **Recommended:** use the one-command start scripts below. They handle everything automatically (virtualenv, dependencies, frontend build, secrets).

### Windows (PowerShell)

> Open **PowerShell** (not CMD). Right-click the Start menu → "Windows PowerShell".

```powershell
git clone https://github.com/your-username/LockSys.git
cd Locksys
.\start.ps1
```

Open **http://localhost:8000** in your browser. Done.

<details>
<summary>Manual setup (advanced)</summary>

#### Step 1 — Clone the repository

```powershell
git clone https://github.com/your-username/LockSys.git
cd LockSys
```

#### Step 2 — Create the `.env` file with secrets

```powershell
Copy-Item .env.example .env
python -c "
import secrets, re
with open('.env', 'r') as f:
    content = f.read()
content = re.sub(r'^JWT_SECRET=.*$', 'JWT_SECRET=' + secrets.token_hex(32), content, flags=re.MULTILINE)
content = re.sub(r'^DB_KEY=.*$', 'DB_KEY=' + secrets.token_hex(32), content, flags=re.MULTILINE)
content = re.sub(r'^DB_PATH=.*\n?', '', content, flags=re.MULTILINE)
content = re.sub(r'^ENVIRONMENT=.*\n?', 'ENVIRONMENT=production\n', content, flags=re.MULTILINE)
with open('.env', 'w') as f:
    f.write(content)
print('Done')
"
```

#### Step 3 — Build the frontend

```powershell
cd frontend
npm install
python generate-icons.py
npm run build
cd ..
```

#### Step 4 — Start the backend

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

Open **http://localhost:8000** in your browser.

</details>

---

### macOS (Bash / Zsh)

```bash
git clone https://github.com/your-username/LockSys.git
cd LockSys
chmod +x start.sh && ./start.sh
```

Open **http://localhost:8000** in your browser. Done.

<details>
<summary>Manual setup (advanced)</summary>

```bash
cp .env.example .env
python3 -c "
import secrets, re
with open('.env', 'r') as f:
    content = f.read()
content = re.sub(r'^JWT_SECRET=.*$', 'JWT_SECRET=' + secrets.token_hex(32), content, flags=re.MULTILINE)
content = re.sub(r'^DB_KEY=.*$', 'DB_KEY=' + secrets.token_hex(32), content, flags=re.MULTILINE)
content = re.sub(r'^DB_PATH=.*\n?', '', content, flags=re.MULTILINE)
content = re.sub(r'^ENVIRONMENT=.*\n?', 'ENVIRONMENT=production\n', content, flags=re.MULTILINE)
with open('.env', 'w') as f:
    f.write(content)
"
cd frontend && npm install && python3 generate-icons.py && npm run build && cd ..
cd backend && pip3 install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

</details>

---

### Linux / Raspberry Pi (Bash)

#### Step 1 — System dependencies

```bash
# Debian / Ubuntu / Raspberry Pi OS
sudo apt update && sudo apt install -y python3 python3-pip python3-venv nodejs npm

# Fedora / RHEL
sudo dnf install -y python3 python3-pip nodejs npm

# Arch Linux
sudo pacman -S python python-pip nodejs npm
```

#### Step 2 — Clone and start

```bash
git clone https://github.com/your-username/LockSys.git
cd LockSys
chmod +x start.sh && ./start.sh
```

Open **http://localhost:8000** in your browser. Done.

**Raspberry Pi — access from other devices on your network:**
```bash
HOST=0.0.0.0 ./start.sh
```
Then open `http://<raspberry-ip>:8000` from any device on the network.

#### Run as a system service (auto-start on boot)

```bash
sudo nano /etc/systemd/system/LockSys.service
```

```ini
[Unit]
Description=LockSys Password Manager
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/LockSys
ExecStart=/home/YOUR_USER/LockSys/start.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now LockSys
```

<details>
<summary>Manual setup (advanced)</summary>

```bash
cp .env.example .env
python3 -c "
import secrets, re
with open('.env', 'r') as f: c = f.read()
c = re.sub(r'^JWT_SECRET=.*$', 'JWT_SECRET=' + secrets.token_hex(32), c, flags=re.MULTILINE)
c = re.sub(r'^DB_KEY=.*$',     'DB_KEY='     + secrets.token_hex(32), c, flags=re.MULTILINE)
c = re.sub(r'^DB_PATH=.*\n?',  '',           c, flags=re.MULTILINE)
c = re.sub(r'^ENVIRONMENT=.*\n?', 'ENVIRONMENT=production\n', c, flags=re.MULTILINE)
with open('.env', 'w') as f: f.write(c)
"
cd frontend && npm install && python3 generate-icons.py && npm run build && cd ..
python3 -m venv .venv && source .venv/bin/activate
pip3 install -r backend/requirements.txt
cd backend && uvicorn main:app --host 127.0.0.1 --port 8000
```

</details>

---

## Quick start — with Docker

Docker handles everything in one command. No need to install Python or Node.js separately.

> Requires **Docker Desktop** to be running.

#### Windows (PowerShell)

```powershell
git clone https://github.com/your-username/LockSys.git
cd LockSys

Copy-Item .env.example .env
python -c "
import secrets, re
with open('.env', 'r') as f:
    content = f.read()
content = re.sub(r'^JWT_SECRET=.*$', 'JWT_SECRET=' + secrets.token_hex(32), content, flags=re.MULTILINE)
content = re.sub(r'^DB_KEY=.*$', 'DB_KEY=' + secrets.token_hex(32), content, flags=re.MULTILINE)
with open('.env', 'w') as f:
    f.write(content)
print('Done')
"

docker compose up --build
```

#### macOS / Linux

```bash
git clone https://github.com/your-username/LockSys.git
cd LockSys

cp .env.example .env
python3 -c "
import secrets, re
with open('.env', 'r') as f:
    content = f.read()
content = re.sub(r'^JWT_SECRET=.*$', 'JWT_SECRET=' + secrets.token_hex(32), content, flags=re.MULTILINE)
content = re.sub(r'^DB_KEY=.*$', 'DB_KEY=' + secrets.token_hex(32), content, flags=re.MULTILINE)
with open('.env', 'w') as f:
    f.write(content)
print('Done')
"

docker compose up --build
```

Open **http://localhost:3000** in your browser.

> **Docker enables AES-256 encryption of the database file at rest** (SQLCipher).
> Without Docker, standard SQLite is used — safe for personal use, but the database file is not encrypted on disk.

---

## First run

1. Open the app URL in your browser.
2. The **"Create account"** tab is visible — this means the database is empty and ready for setup.
3. Choose a username and a strong master password (**minimum 12 characters**).
4. Click **Create account** — this account automatically becomes the **administrator**.
5. The "Create account" tab disappears for everyone. New accounts can only be created by the admin.

> Your master password is **never sent to the server**. All entries are encrypted in your browser before storage using AES-256-GCM with a key derived via PBKDF2-SHA256 (300,000 iterations).

---

## Install as desktop app (PWA)

LockSys can be installed as a standalone desktop application directly from the browser — no store, no installer required.

### Requirements

| Browser | Support |
|---|---|
| Chrome, Brave, Edge (Windows / macOS) | ✅ Full support |
| Safari (macOS 14+ / iOS) | ✅ Via "Add to Dock" / "Add to Home Screen" |
| Firefox | ❌ Not supported |

> **Note:** the PWA install feature is only available in the **production build** (`npm run build`). It is intentionally disabled in development mode to avoid service worker caching conflicts.

### How to install (user side)

Once the app is running and the icons are generated:

1. Open LockSys in **Chrome, Edge, or Brave**
2. An **"Install app"** button appears at the bottom of the left sidebar
3. Click it — the browser opens its native install dialog
4. Confirm — LockSys is added to your desktop and taskbar

The app opens in its own window (no browser chrome, no address bar), exactly like a native application. It can be uninstalled at any time like any regular app.

### Building for production with PWA

```bash
# From the frontend/ directory
npm run build        # compiles + generates service worker
npm run preview      # serve the built app locally on port 4173
```

---

## Managing users (admin)

### Access the admin panel

Once logged in as admin, click **Administration** in the left sidebar.

### Create a new account — Option A (direct)

1. Click **Create account**
2. Select the **Direct** tab
3. Enter a username and a temporary password
4. Click **Create account**
5. An info box shows the credentials — **copy them and share with the user** (shown once only)
6. The user logs in with the temporary password

### Create a new account — Option B (invite link)

1. Click **Create account**
2. Select the **Invite link** tab
3. Choose an expiry duration (1 to 30 days)
4. Click **Generate link**
5. Copy the link and send it to the user
6. The user opens the link, chooses their own username and password
7. The link works only **once** and expires automatically

### Edit an account

In the **Users** table, click the **pencil icon** next to a user to:
- Change their username
- Reset their password

> **Warning:** resetting a user's password makes their existing vault entries permanently inaccessible (they are encrypted with the old password).

### Disable or delete an account

Click the **trash icon** next to a user. A dialog offers two options:

| Action | Effect |
|---|---|
| **Disable account** | User can no longer log in. Their data is preserved. |
| **Delete permanently** | User and all their vaults/entries are deleted. Irreversible. |

---

## Stopping the app

### Without Docker

Press `Ctrl+C` in the terminal running `start.sh` / `start.ps1`.

### With Docker

```bash
docker compose down
```

---

## Backup & restore

The entire vault lives in a single file:

```
LockSys/data/LockSys.db
```

### Backup

#### Windows (PowerShell)
```powershell
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item .\data\LockSys.db ".\data\LockSys_backup_$ts.db"
```

#### macOS / Linux
```bash
cp ./data/LockSys.db ./data/LockSys_backup_$(date +%Y%m%d_%H%M%S).db
```

### Restore

1. Stop the app
2. Replace `./data/LockSys.db` with your backup file
3. Restart the app

---

## Troubleshooting

### "Failed to fetch" on the login page

The frontend cannot reach the backend. Check:

1. **Is the backend running?**
   ```bash
   # macOS / Linux
   curl http://localhost:8000/health
   # Expected: {"status":"ok","version":"1.0.0"}
   ```
   ```powershell
   # Windows
   Invoke-WebRequest -Uri http://localhost:8000/health
   ```
   If this fails, start the backend (Step 3 above).

2. **Is uvicorn listening on port 8000?**
   Make sure you used `--port 8000` and not a different port.

3. **Firewall?**
   Check that port 8000 is not blocked by antivirus or firewall on localhost.

---

### "Create account" tab not visible after re-launching

The database already contains a user. To start fresh:

1. Stop both backend and frontend
2. Delete the database file:
   ```powershell
   # Windows
   Remove-Item .\data\LockSys.db
   ```
   ```bash
   # macOS / Linux
   rm ./data/LockSys.db
   ```
3. Restart — the tab reappears

---

### "Administration" link not visible in the sidebar

Your account is not flagged as admin in the database. This happens when:
- The database was not reset before creating the first account with the new code
- The account was created before the admin system was set up

Fix: delete `data/LockSys.db` and create a new first account (see above).

---

### DB_PATH / database created in the wrong location

If you copied `.env.example` to `.env` without modification, the line `DB_PATH=/app/data/LockSys.db` points to a Docker-specific path. Remove it for local development.

Your `.env` should look like this for local use (no Docker):

```env
JWT_SECRET=<your-generated-secret>
DB_KEY=<your-generated-secret>
ENVIRONMENT=development
```

No `DB_PATH` line. The database will be created automatically in `./data/LockSys.db`.

---

### `pip install` fails on `argon2-cffi` or `cryptography`

These packages require a C compiler.

#### Windows
Install the [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/):
1. Download and run the installer
2. Select **"Desktop development with C++"**
3. Re-run `pip install -r requirements.txt`

#### macOS
```bash
xcode-select --install
pip3 install -r requirements.txt
```

#### Linux (Debian / Ubuntu)
```bash
sudo apt install -y build-essential libffi-dev libssl-dev
pip3 install -r requirements.txt
```

---

### `npm install` is slow or fails

Try clearing the npm cache:
```bash
npm cache clean --force
npm install
```

If on a corporate network, check proxy settings.

---

### Port 5173 or 8000 already in use

```bash
# macOS / Linux — find what's using the port
lsof -i :8000
lsof -i :5173
```

```powershell
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :5173
```

Kill the process or change the port:
- Backend: `uvicorn main:app --host 127.0.0.1 --port 8001`
- Frontend: `npm run dev -- --port 5174`

---

### Python version check fails

LockSys requires Python **3.11 or higher**.

```bash
python3 --version   # macOS / Linux
python --version    # Windows
```

If you have multiple versions, use `python3.11` explicitly:
```bash
python3.11 -m pip install -r requirements.txt
python3.11 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

---

## Configuration reference

All configuration is done via the `.env` file in the project root.

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWT tokens. Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DB_KEY` | No | `LockSys_dev_insecure_key_change_me` | SQLCipher encryption key (only used with Docker / SQLCipher). Ignored with plain SQLite. |
| `DB_PATH` | No | `./data/LockSys.db` | Path to the SQLite database. **Do not set this for local development** — it's only used inside Docker. |
| `ENVIRONMENT` | No | `development` | Set to `production` to hide `/docs` (API documentation). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | Access token lifetime in minutes. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token lifetime in days. |

---

## Security model

| Layer | What happens |
|---|---|
| **Authentication** | Master password hashed with Argon2id (m=64 MB, t=3, p=1) — never stored in plain text |
| **Key derivation** | Client derives AES-256-GCM key via PBKDF2-SHA256 (300,000 iterations) using the Web Crypto API |
| **Encryption** | Every entry encrypted client-side before reaching the server — server stores opaque ciphertext only |
| **Sessions** | 15-min access tokens + 7-day HttpOnly refresh cookie (SameSite=Strict) |
| **Auto-lock** | Vault locks after 5 min of inactivity; derived key is wiped from memory |
| **Clipboard** | Copied passwords auto-clear from clipboard after 30 seconds |
| **Rate limiting** | 5 login attempts/min per IP · 10 registrations/hour per IP |
| **Headers** | CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy on every response |
| **Admin** | Admin flag stored server-side — first registered account only. Admin panel protected by server-side role check. |

---

## Project structure

```
LockSys/
├── backend/                  # Python — FastAPI + SQLite
│   ├── main.py               # App entry point, middleware, CORS
│   ├── config.py             # Settings (reads .env from project root)
│   ├── database.py           # DB connection, schema init, migrations
│   ├── models/
│   │   └── user.py           # Pydantic schemas (auth + admin)
│   ├── routers/
│   │   ├── auth.py           # /auth/* — login, register, refresh, logout
│   │   ├── admin.py          # /admin/* — user management, invite tokens
│   │   ├── vaults.py         # /vaults/* — folder CRUD
│   │   └── entries.py        # /entries/* — password CRUD
│   ├── services/
│   │   ├── crypto.py         # Argon2, JWT, KDF salt
│   │   └── audit_service.py  # Audit log writer
│   └── middleware/
│       ├── rate_limit.py     # slowapi rate limiter
│       └── security_headers.py  # CSP, X-Frame-Options, etc.
│
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind
│   └── src/
│       ├── services/
│       │   ├── api.ts        # Typed fetch client (auto token refresh)
│       │   └── crypto.ts     # Web Crypto API — PBKDF2, AES-256-GCM
│       ├── store/
│       │   └── authStore.ts  # Zustand — user, token, crypto key in memory
│       ├── hooks/
│       │   ├── useVault.ts       # Data fetching + decrypt for entries
│       │   ├── useInstallPWA.ts  # PWA install prompt hook
│       │   ├── useAutoLock.ts
│       │   └── useClipboard.ts
│       ├── components/
│       │   ├── layout/       # Sidebar, TopBar
│       │   ├── shared/       # LockScreen, CopyButton, StrengthBar
│       │   └── vault/        # EntryCard, EntryDetail, EntryForm
│       └── pages/
│           ├── Login.tsx     # Sign in / first account creation / invite
│           ├── Dashboard.tsx # All items view (main page)
│           ├── Vault.tsx     # Single folder view
│           ├── Generator.tsx # Password generator
│           ├── Settings.tsx  # User settings
│           └── Admin.tsx     # Admin panel
│
├── frontend/
│   └── generate-icons.py     # One-time script: generates PWA icons (no dependencies)
│
├── data/                     # Created automatically — contains LockSys.db
├── start.sh                  # One-command startup — Linux / macOS / Raspberry Pi
├── start.ps1                 # One-command startup — Windows PowerShell
├── docker-compose.yml
├── .env.example              # Copy to .env and fill in secrets
└── README.md
```

---

## Roadmap

- [x] Phase 1 — Auth, vault/entry CRUD, AES-256-GCM encryption, auto-lock, clipboard
- [x] Phase 1.5 — Admin system, invite tokens, role-based access
- [x] Phase 1.6 — PWA: installable as a desktop app (Chrome / Edge / Brave / Safari)
- [ ] Phase 2 — Password health dashboard (weak / reused / old)
- [ ] Phase 3 — TOTP/2FA with live countdown display
- [ ] Phase 4 — Entry sharing between users
- [ ] Phase 5 — Import/export (Bitwarden JSON, CSV)
- [ ] Phase 6 — CLI, change master password, theme toggle

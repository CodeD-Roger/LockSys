#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vaultix — one-command startup (Linux / macOS / Raspberry Pi)
#
# Usage:
#   ./start.sh                    # localhost only (default)
#   HOST=0.0.0.0 ./start.sh       # expose to local network (e.g. Raspberry Pi)
#   PORT=9000    ./start.sh       # custom port
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

GREEN='\033[0;32m' ; YELLOW='\033[1;33m' ; RED='\033[0;31m' ; NC='\033[0m'
info()  { echo -e "${GREEN}[vaultix]${NC} $*"; }
warn()  { echo -e "${YELLOW}[vaultix]${NC} $*"; }
error() { echo -e "${RED}[vaultix]${NC} $*" >&2; exit 1; }

# ── Dependency checks ─────────────────────────────────────────────────────────
command -v python3 >/dev/null 2>&1 || error "Python 3.11+ is required. Install from https://python.org"
command -v node    >/dev/null 2>&1 || error "Node.js 18+ is required. Install from https://nodejs.org"
command -v npm     >/dev/null 2>&1 || error "npm is required (comes with Node.js)"

PY_VER=$(python3 -c "import sys; print(sys.version_info >= (3,11))")
[ "$PY_VER" = "True" ] || error "Python 3.11+ required (found $(python3 --version))"

# ── .env setup ────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    warn ".env not found — generating from template with random secrets..."
    cp .env.example .env
    python3 - <<'PYEOF'
import secrets, re
with open('.env', 'r') as f:
    c = f.read()
c = re.sub(r'^JWT_SECRET=.*$', 'JWT_SECRET=' + secrets.token_hex(32), c, flags=re.MULTILINE)
c = re.sub(r'^DB_KEY=.*$',     'DB_KEY='     + secrets.token_hex(32), c, flags=re.MULTILINE)
c = re.sub(r'^DB_PATH=.*\n?',  '', c, flags=re.MULTILINE)
c = re.sub(r'^ENVIRONMENT=.*\n?', 'ENVIRONMENT=production\n', c, flags=re.MULTILINE)
with open('.env', 'w') as f:
    f.write(c)
print('  Secrets written to .env')
PYEOF
fi

# ── Python virtual environment ────────────────────────────────────────────────
if [ ! -d ".venv" ]; then
    info "Creating Python virtual environment..."
    python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

# ── Python dependencies ───────────────────────────────────────────────────────
info "Checking Python dependencies..."
pip install -r backend/requirements.txt -q --disable-pip-version-check

# ── Frontend build ────────────────────────────────────────────────────────────
if [ ! -d "frontend/dist" ]; then
    info "Building frontend (first run — this takes ~30 s)..."
    cd frontend
    npm install --silent
    [ ! -f "public/pwa-192x192.png" ] && python3 generate-icons.py
    npm run build
    cd ..
    info "Frontend built successfully."
fi

# ── Start ─────────────────────────────────────────────────────────────────────
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

echo ""
info "Vaultix is running at http://${HOST}:${PORT}"
[ "$HOST" = "0.0.0.0" ] && warn "Exposed on all interfaces — make sure your firewall is configured."
echo ""

cd backend
exec uvicorn main:app --host "$HOST" --port "$PORT"

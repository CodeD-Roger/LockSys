# ─────────────────────────────────────────────────────────────────────────────
# Vaultix — one-command startup (Windows PowerShell)
#
# Usage:
#   .\start.ps1                          # localhost only (default)
#   $env:HOST="0.0.0.0"; .\start.ps1    # expose to local network
#   $env:PORT="9000";    .\start.ps1    # custom port
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function info  { Write-Host "[vaultix] $args" -ForegroundColor Green  }
function warn  { Write-Host "[vaultix] $args" -ForegroundColor Yellow }
function fatal { Write-Host "[vaultix] $args" -ForegroundColor Red; exit 1 }

# ── Dependency checks ─────────────────────────────────────────────────────────
if (-not (Get-Command python  -ErrorAction SilentlyContinue) -and
    -not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    fatal "Python 3.11+ is required. Download from https://python.org"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    fatal "Node.js 18+ is required. Download from https://nodejs.org"
}

$pyCmd = if (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" } else { "python" }
$pyOk  = & $pyCmd -c "import sys; print(sys.version_info >= (3,11))" 2>$null
if ($pyOk -ne "True") {
    fatal "Python 3.11+ required. Found: $(& $pyCmd --version)"
}

# ── .env setup ────────────────────────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    warn ".env not found — generating from template with random secrets..."
    Copy-Item ".env.example" ".env"
    & $pyCmd -c @'
import secrets, re
with open(".env", "r") as f:
    c = f.read()
c = re.sub(r"^JWT_SECRET=.*$", "JWT_SECRET=" + secrets.token_hex(32), c, flags=re.MULTILINE)
c = re.sub(r"^DB_KEY=.*$",     "DB_KEY="     + secrets.token_hex(32), c, flags=re.MULTILINE)
c = re.sub(r"^DB_PATH=.*\n?",  "",           c, flags=re.MULTILINE)
c = re.sub(r"^ENVIRONMENT=.*\n?", "ENVIRONMENT=production\n", c, flags=re.MULTILINE)
with open(".env", "w") as f:
    f.write(c)
print("  Secrets written to .env")
'@
}

# ── Python virtual environment ────────────────────────────────────────────────
if (-not (Test-Path ".venv")) {
    info "Creating Python virtual environment..."
    & $pyCmd -m venv .venv
}
& ".venv\Scripts\Activate.ps1"

# ── Python dependencies ───────────────────────────────────────────────────────
info "Checking Python dependencies..."
pip install -r backend\requirements.txt -q --disable-pip-version-check

# ── Frontend build ────────────────────────────────────────────────────────────
if (-not (Test-Path "frontend\dist")) {
    info "Building frontend (first run — this takes ~30 s)..."
    Set-Location frontend
    npm install --silent
    if (-not (Test-Path "public\pwa-192x192.png")) {
        & $pyCmd generate-icons.py
    }
    npm run build
    Set-Location ..
    info "Frontend built successfully."
}

# ── Start ─────────────────────────────────────────────────────────────────────
$h = if ($env:HOST) { $env:HOST } else { "127.0.0.1" }
$p = if ($env:PORT) { $env:PORT } else { "8000" }

Write-Host ""
info "Vaultix is running at http://${h}:${p}"
if ($h -eq "0.0.0.0") {
    warn "Exposed on all interfaces — make sure your firewall is configured."
}
Write-Host ""

Set-Location backend
uvicorn main:app --host $h --port $p

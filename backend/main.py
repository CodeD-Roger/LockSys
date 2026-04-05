import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings
from database import init_db
from middleware.rate_limit import limiter
from middleware.security_headers import SecurityHeadersMiddleware
from routers import admin, auth, entries, vaults

# Register MIME types that Python's stdlib may not know about
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")

# Path to the pre-built frontend (produced by `npm run build`)
_FRONTEND = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="LockSys API",
    version="1.0.0",
    # Only expose docs in development
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# CORS — used when frontend dev server (port 5173) talks to backend (port 8000).
# In production the frontend is served by FastAPI on the same origin → no CORS needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:4173",   # Vite preview
        "http://127.0.0.1:4173",
        "http://localhost:8000",   # Same-origin (production)
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(vaults.router)
app.include_router(entries.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "1.0.0"}


# ── Frontend static files ─────────────────────────────────────────────────────
# Registered AFTER all API routes so API paths always take priority.
# Serves the Vite production build; falls back to index.html for SPA routing.
# Only active when frontend/dist/ exists (i.e. after `npm run build`).

if _FRONTEND.is_dir():
    _FRONTEND_RESOLVED = _FRONTEND.resolve()

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str = "") -> FileResponse:
        if full_path:
            target = (_FRONTEND / full_path).resolve()
            # Security: reject path traversal attempts
            try:
                target.relative_to(_FRONTEND_RESOLVED)
            except ValueError:
                return FileResponse(str(_FRONTEND / "index.html"))
            if target.is_file():
                media_type = mimetypes.guess_type(str(target))[0] or None
                return FileResponse(str(target), media_type=media_type)
        return FileResponse(str(_FRONTEND / "index.html"))

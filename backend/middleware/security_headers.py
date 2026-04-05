from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # FIX 10 : connect-src restreint à 'self' en production
        # localhost uniquement autorisé en développement (évite les attaques DNS rebinding)
        if settings.environment == "development":
            connect_src = "'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:4173 http://127.0.0.1:4173"
        else:
            connect_src = "'self'"

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            f"connect-src {connect_src}"
        )

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "clipboard-write=(self), clipboard-read=()"
        response.headers["X-XSS-Protection"] = "0"

        # FIX 11 : HSTS uniquement en production (HTTPS requis)
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response

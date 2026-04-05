from slowapi import Limiter
from slowapi.util import get_remote_address

# Default: 60 req/min per IP for all routes.
# Auth routes override this with stricter limits via @limiter.limit() decorators.
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

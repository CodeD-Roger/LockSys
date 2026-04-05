import warnings
from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings

_ROOT = Path(__file__).resolve().parent.parent

_INSECURE_DB_KEY = "vaultix_dev_insecure_key_change_me"


class Settings(BaseSettings):
    jwt_secret: str
    # FIX 5 : pas de valeur par défaut — doit être défini explicitement
    db_key: str = _INSECURE_DB_KEY
    db_path: str = str(_ROOT / "data" / "vaultix.db")
    environment: str = "development"

    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = str(_ROOT / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        # JWT_SECRET : longueur minimale 32 caractères
        if len(self.jwt_secret) < 32:
            raise ValueError(
                "JWT_SECRET must be at least 32 characters. "
                "Generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )

        # DB_KEY : clé par défaut interdite en production
        if self.environment == "production" and self.db_key == _INSECURE_DB_KEY:
            raise ValueError(
                "DB_KEY must be set explicitly in production. "
                "Generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )

        # DB_KEY : avertissement en développement si clé insécurisée
        if self.environment != "production" and self.db_key == _INSECURE_DB_KEY:
            warnings.warn(
                "DB_KEY is using the insecure default value. "
                "Set a strong DB_KEY in your .env file before going to production.",
                RuntimeWarning,
                stacklevel=2,
            )

        return self


settings = Settings()

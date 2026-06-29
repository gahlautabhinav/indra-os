from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to apps/api/.env so config loads the same regardless of cwd —
# the MCP server and lightrag_ui launcher run from arbitrary project dirs.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    database_url: str = "postgresql+asyncpg://indra:indra_secret@localhost:5432/indra"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "dev_secret"
    jwt_algorithm: str = "HS256"
    # 30 days — stay signed in until explicit logout (local dev tool). Override
    # via JWT_ACCESS_TOKEN_EXPIRE_MINUTES for a shorter lifetime in production.
    jwt_access_token_expire_minutes: int = 43200
    jwt_refresh_token_expire_days: int = 7

    environment: str = "development"
    log_level: str = "DEBUG"
    db_echo: bool = False  # set DB_ECHO=true to log every SQL statement

    otel_endpoint: str = "http://localhost:4317"
    cors_origins: str = "http://localhost:3333"

    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"

    # Free local embeddings (model2vec) for Smriti project ingestion / search.
    local_embeddings_enabled: bool = True
    local_embed_model: str = "minishlab/potion-base-8M"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    def validate_production_secrets(self) -> None:
        if not self.is_development and len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters in production")


settings = Settings()

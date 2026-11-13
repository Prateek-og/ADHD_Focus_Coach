from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    CLERK_SECRET_KEY: str
    CLERK_JWKS_URL: str
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OLLAMA_MODEL: str = "qwen2.5:7b"
    AI_PROVIDER: str = "ollama"
    AI_BREAKDOWN_DAILY_LIMIT: int = 10
    AI_RESPONSE_CACHE_TTL_SECONDS: int = 2592000
    AI_PROMPT_VERSION: str = "v2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

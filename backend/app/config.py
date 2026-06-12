from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 3001
    ai_backend_internal_key: str = "dev-internal-key"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_fast_model: str = "deepseek-v4-flash"
    deepseek_eval_model: str = "deepseek-v4-pro"
    redis_url: str = "redis://localhost:6379"
    kafka_brokers: str = "localhost:9092"
    whisper_model: str = "small"
    max_upload_mb: int = 5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

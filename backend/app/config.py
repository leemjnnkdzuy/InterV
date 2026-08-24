from functools import lru_cache
from ipaddress import ip_address

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _is_loopback(host: str) -> bool:
    if host.casefold() == "localhost":
        return True
    try:
        return ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


class Settings(BaseSettings):
    port: int = Field(default=3001, ge=1, le=65535)
    grpc_host: str = "127.0.0.1"
    grpc_port: int = Field(default=50051, ge=1, le=65535)
    grpc_tls_cert_path: str = ""
    grpc_tls_key_path: str = ""
    grpc_tls_client_ca_path: str = ""
    ai_backend_internal_key: str = ""
    vbee_app_id: str = ""
    vbee_token: str = ""
    vbee_webhook_url: str = "https://example.com/vbee-callback"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_fast_model: str = "deepseek-v4-flash"
    deepseek_eval_model: str = "deepseek-v4-pro"
    deepseek_fast_timeout_seconds: float = Field(default=45.0, ge=5, le=300)
    deepseek_eval_timeout_seconds: float = Field(default=240.0, ge=30, le=900)
    deepseek_eval_max_tokens: int = Field(default=32_768, ge=1024, le=65_536)

    @property
    def deepseek_timeout_seconds(self) -> float:
        return self.deepseek_fast_timeout_seconds
    redis_url: str = "redis://localhost:6379"
    kafka_brokers: str = "localhost:9092"
    whisper_model: str = "small"
    whisper_cpu_threads: int = Field(default=4, ge=1, le=32)
    assembly_ai_api_key: str = ""
    assembly_ai_streaming_url: str = "wss://streaming.assemblyai.com/v3/ws"
    assembly_ai_speech_model: str = "universal-3-5-pro"
    sensevoice_model: str = Field(
        default="iic/SenseVoiceSmall",
        min_length=1,
        max_length=200,
    )
    sensevoice_model_revision: str = Field(
        default="master",
        pattern=r"^[A-Za-z0-9._/-]{1,100}$",
    )
    sensevoice_model_sha256: str = Field(
        default=(
            "833ca2dcfdf8ec91bd4f31cfac36d6124e0c459074d5e909aec9cabe6204a3ea"
        ),
        pattern=r"^[0-9a-fA-F]{64}$",
    )
    sensevoice_device: str = Field(
        default="cpu",
        pattern=r"^(cpu|cuda(?::\d+)?)$",
    )
    max_upload_mb: int = Field(default=5, ge=1, le=20)
    document_parse_timeout_seconds: float = Field(default=30, ge=5, le=120)
    memory_cache_max_items: int = Field(default=256, ge=16, le=4096)
    memory_cache_max_bytes: int = Field(
        default=64 * 1024 * 1024,
        ge=4 * 1024 * 1024,
        le=512 * 1024 * 1024,
    )
    rag_enabled: bool = True
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_path: str = "./data/qdrant"
    qdrant_collection: str = "interv_interview_knowledge_v1"
    rag_dense_model: str = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    rag_sparse_model: str = "Qdrant/bm25"
    rag_model_cache_dir: str = "./data/model-cache"
    rag_top_k: int = Field(default=8, ge=1, le=20)
    rag_candidate_limit: int = Field(default=32, ge=8, le=100)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_security_boundary(self) -> "Settings":
        key = self.ai_backend_internal_key.strip()
        if len(key.encode("utf-8")) < 32 or key == "dev-internal-key":
            raise ValueError(
                "AI_BACKEND_INTERNAL_KEY must be a unique secret of at least 32 bytes"
            )
        has_cert = bool(self.grpc_tls_cert_path.strip())
        has_key = bool(self.grpc_tls_key_path.strip())
        if has_cert != has_key:
            raise ValueError(
                "GRPC_TLS_CERT_PATH and GRPC_TLS_KEY_PATH must be configured together"
            )
        if not _is_loopback(self.grpc_host) and not (has_cert and has_key):
            raise ValueError(
                "TLS is mandatory when GRPC_HOST is not a loopback address"
            )
        if self.grpc_tls_client_ca_path and not (has_cert and has_key):
            raise ValueError("mTLS client CA requires a TLS certificate and key")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

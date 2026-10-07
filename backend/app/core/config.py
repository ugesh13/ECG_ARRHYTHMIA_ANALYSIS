"""Central configuration, loaded from environment variables (see .env.example)."""
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def _path(env: str, default: str) -> Path:
    p = Path(os.getenv(env, default))
    return p if p.is_absolute() else (BACKEND_DIR / p).resolve()


def _list(env: str, default: str) -> list[str]:
    return [x.strip() for x in os.getenv(env, default).split(",") if x.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "ECG Arrhythmia Analysis API")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    cors_origins: list[str] = field(
        default_factory=lambda: _list("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    )
    mitbih_dir: Path = field(default_factory=lambda: _path("MITBIH_DIR", "data/mitbih"))
    uploads_dir: Path = field(default_factory=lambda: _path("UPLOADS_DIR", "data/uploads"))
    history_file: Path = field(default_factory=lambda: _path("HISTORY_FILE", "data/history.json"))
    models_dir: Path = field(default_factory=lambda: _path("MODELS_DIR", "models"))
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "50"))
    max_signal_points: int = int(os.getenv("MAX_SIGNAL_POINTS", "5000"))
    # WFDB record files accepted for upload. .xws is deliberately not accepted/used.
    allowed_extensions: tuple[str, ...] = (".hea", ".dat", ".atr")

    @property
    def frozen_model_path(self) -> Path:
        return self.models_dir / "phase8" / "random_forest_final_phase8.joblib"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


settings = Settings()

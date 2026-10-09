"""Application configuration and default settings."""

import os
from typing import List


class Settings:
    PROJECT_NAME: str = "Lost in Space - Rover Mission Control"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    # Default simulation settings
    DEFAULT_SEED: int = 42
    DEFAULT_SIZE: int = 25
    DEFAULT_STRATEGY: str = "greedy"
    DEFAULT_MAX_ENERGY: int = 220
    DEFAULT_SENSOR_RADIUS: int = 4
    DEFAULT_BLOCK_RATE: float = 0.04
    DEFAULT_SAFETY_MARGIN: int = 6


settings = Settings()

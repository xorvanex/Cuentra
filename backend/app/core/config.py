"""Configuración simple por entorno, sin cargar archivos ni secretos implícitos."""

import os
from typing import ClassVar


class Settings:
    app_name: str = os.getenv("APP_NAME", "Cuentra API")
    app_env: str = os.getenv("APP_ENV", "development")
    api_prefix: str = os.getenv("API_PREFIX", "/api/v1")
    allow_local_test_non_loopback: bool = os.getenv(
        "CUENTRA_ALLOW_LOCAL_TEST_NON_LOOPBACK", "false"
    ).lower() == "true"
    cors_origins: ClassVar[list[str]] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]


settings = Settings()

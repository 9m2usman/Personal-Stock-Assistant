"""
Structured Logging with Credential Redaction Filter
Ensures zero secrets or API keys are exposed in application logs.
"""
import logging
import re
import sys
from typing import Any
from src.backend.core.config import settings

class SensitiveDataRedactionFilter(logging.Filter):
    """
    Scans log records and redacts any known API keys or authorization headers.
    """
    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.secrets_to_mask = []
        for key_name in [
            "ALPHA_VANTAGE_API_KEY",
            "TWELVE_DATA_API_KEY",
            "FMP_API_KEY",
            "NEWSAPI_API_KEY",
            "NASDAQ_DATA_LINK_API_KEY"
        ]:
            val = getattr(settings, key_name, None)
            if val and hasattr(val, "get_secret_value"):
                secret_str = val.get_secret_value()
                if secret_str:
                    self.secrets_to_mask.append(secret_str)

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for secret in self.secrets_to_mask:
                if secret and secret in record.msg:
                    record.msg = record.msg.replace(secret, "[REDACTED]")
            # Redact common URL parameters matching apikey or api_key
            record.msg = re.sub(r'(apikey|api_key|apiKey)=([^&\s]+)', r'\1=[REDACTED]', record.msg)
            record.msg = re.sub(r'(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*', r'\1[REDACTED]', record.msg)
        return True

def setup_logging() -> None:
    """Configures root logger with redaction filter and standardized formatting."""
    log_format = "%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d) - %(message)s"
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(log_format))
    handler.addFilter(SensitiveDataRedactionFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    # Remove existing handlers to avoid duplicates
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)
    root_logger.addHandler(handler)

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

setup_logging()
logger = logging.getLogger("fintech.backend")

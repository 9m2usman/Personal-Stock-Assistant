"""
Unit Tests for System Configuration & Security
"""
import pytest
from src.backend.core.config import settings

def test_settings_loaded():
    """Verify application metadata loads correctly."""
    assert settings.APP_NAME == "AI Stock Market Assistant"
    assert settings.APP_VERSION == "0.1.0"
    assert settings.API_V1_PREFIX == "/api/v1"

def test_secret_string_masking():
    """Verify that SecretStr prevents credential leakage in string conversions."""
    for key_name in [
        "ALPHA_VANTAGE_API_KEY",
        "TWELVE_DATA_API_KEY",
        "FMP_API_KEY",
        "NEWSAPI_API_KEY",
        "NASDAQ_DATA_LINK_API_KEY",
        "GROQ_API_KEY"
    ]:
        val = getattr(settings, key_name)
        if val is not None:
            # str(val) must render as '**********', never the real secret
            assert str(val) == "**********"
            assert repr(val) == "SecretStr('**********')"
            # Actual secret value is only accessible via explicit .get_secret_value()
            assert len(val.get_secret_value()) > 0

def test_sec_edgar_user_agent():
    """Verify compliant SEC EDGAR User-Agent is defined."""
    assert "InkVector" in settings.SEC_EDGAR_USER_AGENT
    assert "@" in settings.SEC_EDGAR_USER_AGENT

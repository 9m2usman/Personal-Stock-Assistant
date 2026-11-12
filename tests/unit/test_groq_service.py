"""
Unit Tests for Groq Cloud LLM Service
Verifies Groq API integration, key validation, and error resilience.
"""
import pytest
from pydantic import SecretStr
from src.backend.ai.groq_service import GroqService, groq_service
from src.backend.core.config import settings

def test_groq_availability(monkeypatch):
    service = GroqService()
    
    # When key is configured
    monkeypatch.setattr(settings, "GROQ_API_KEY", SecretStr("test_groq_key"))
    assert service.is_available is True

    # When key is None
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    assert service.is_available is False

@pytest.mark.asyncio
async def test_groq_unconfigured_fallback(monkeypatch):
    service = GroqService()
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    res = await service.generate_financial_analysis("What is EBITDA?")
    assert res is None

@pytest.mark.asyncio
async def test_groq_mock_inference(monkeypatch):
    service = GroqService()
    monkeypatch.setattr(settings, "GROQ_API_KEY", SecretStr("test_groq_key"))

    class MockResponse:
        status_code = 200
        def json(self):
            return {
                "choices": [
                    {"message": {"content": "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization."}}
                ]
            }

    class MockClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        async def post(self, url, json, headers):
            return MockResponse()

    import httpx
    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockClient())

    res = await service.generate_financial_analysis(
        user_query="What is EBITDA?",
        financial_context="Financial metric definition"
    )
    assert res is not None
    assert "EBITDA stands for" in res

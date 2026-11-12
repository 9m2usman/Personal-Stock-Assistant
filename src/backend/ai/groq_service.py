"""
Groq Cloud LLM Service
Provides high-speed, institutional-grade AI reasoning and financial analysis using Groq's LPU inference engine.
"""
from typing import List, Dict, Any, Optional
import httpx
from src.backend.core.config import settings
from src.backend.core.logging import logger

class GroqService:
    """Interface to Groq Cloud OpenAI-compatible Chat Completions API."""

    def __init__(self):
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def is_available(self) -> bool:
        """Checks if Groq API key is present and configured."""
        return bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.get_secret_value())

    async def generate_financial_analysis(
        self,
        user_query: str,
        financial_context: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None
    ) -> Optional[str]:
        """
        Sends grounded financial data and user instructions to Groq for high-speed inference.
        Returns the generated markdown response or None if unavailable/error.
        """
        if not self.is_available:
            return None

        api_key = settings.GROQ_API_KEY.get_secret_value()
        model = getattr(settings, "GROQ_MODEL", "qwen/qwen3.8-27b")

        default_system = (
            "You are INKVECTOR, an institutional-grade AI Financial Analyst and Portfolio Intelligence Assistant. "
            "You provide precise, empirical, and articulate financial analysis based on live market quotes, "
            "financial ratios, valuation metrics, and portfolio scenarios. "
            "Always format your answers using clean GitHub-flavored markdown with tables, key bullet points, "
            "and concise analytical summaries. Never hallucinate numbers; if financial data is provided in context, "
            "reference it directly. If certain data is unavailable, state it clearly."
        )

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt or default_system}
        ]

        # Add recent conversation history (last 6 turns)
        if conversation_history:
            for msg in conversation_history[-6:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})

        # Build prompt with grounded financial context if present
        user_content = user_query
        if financial_context:
            user_content = (
                f"### Live Financial Context & Tool Output:\n{financial_context}\n\n"
                f"### User Question / Instruction:\n{user_query}\n\n"
                f"Please analyze this data, answer the user's specific question, and provide institutional commentary."
            )

        messages.append({"role": "user", "content": user_content})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1024,
            "top_p": 0.95
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "InkVector/1.0"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"].get("content", "").strip()
                elif response.status_code == 404:
                    # Model not found on account, fallback to openai/gpt-oss-120b
                    logger.warning("Groq model %s returned 404, retrying with openai/gpt-oss-120b", model)
                    payload["model"] = "openai/gpt-oss-120b"
                    retry_resp = await client.post(self.endpoint, json=payload, headers=headers)
                    if retry_resp.status_code == 200:
                        data = retry_resp.json()
                        choices = data.get("choices", [])
                        if choices and "message" in choices[0]:
                            return choices[0]["message"].get("content", "").strip()
                
                logger.warning("Groq API returned status %s: %s", response.status_code, response.text[:200])
                return None
        except Exception as e:
            logger.error("Groq inference error: %s", e)
            return None

groq_service = GroqService()

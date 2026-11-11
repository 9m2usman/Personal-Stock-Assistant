"""
AI Financial Research Assistant Agent
Modular harness coordinating financial intent recognition, function tool invocation,
context memory, and UI widget generation.
"""
from typing import List, Dict, Any, Optional
from src.backend.ai.context import UIWidget, ChatMessage, ChatResponse, conversation_manager
from src.backend.ai.orchestrator import ai_orchestrator, AIOrchestrator

class FinancialAIAgent:
    """Institutional-grade financial assistant agent with zero hallucination guarantee."""

    def __init__(self, orchestrator: AIOrchestrator = ai_orchestrator):
        self.orchestrator = orchestrator

    @property
    def sessions(self) -> Dict[str, List[ChatMessage]]:
        """Backwards compatibility for direct dictionary access."""
        return {s_id: ctx.history for s_id, ctx in conversation_manager._contexts.items()}

    def get_history(self, session_id: str) -> List[ChatMessage]:
        return conversation_manager.get_history(session_id)

    async def process_message(self, session_id: str, user_text: str) -> ChatResponse:
        """Processes user input, invokes appropriate financial tools, and formats UI response."""
        return await self.orchestrator.run(session_id=session_id, user_text=user_text)

ai_agent = FinancialAIAgent()

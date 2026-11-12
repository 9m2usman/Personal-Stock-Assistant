"""
AI Harness Context & Session Memory Management
Manages per-session conversation history, active instrument context, and portfolio states.
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class UIWidget(BaseModel):
    widget_type: str  # QUOTE_CARD, CANDLESTICK_CHART, TECHNICAL_SUMMARY, FUNDAMENTAL_CARD, NEWS_FEED, PORTFOLIO_SUMMARY, JOB_STATUS
    title: str
    data: Dict[str, Any]

class ChatMessage(BaseModel):
    role: str  # user, assistant, system, tool
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    widgets: List[UIWidget] = Field(default_factory=list)
    citations: List[str] = Field(default_factory=list)
    tool_calls: Optional[List[Dict[str, Any]]] = None

class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessage
    execution_trace: Optional[Dict[str, Any]] = None
    answer: Optional[str] = None
    ui_widgets: Optional[List[UIWidget]] = None
    sources: Optional[List[str]] = None

class ConversationContext(BaseModel):
    session_id: str
    user_id: str = "default_analyst"
    current_symbol: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list)
    portfolio_context: Optional[Dict[str, Any]] = None
    last_tool_results: Dict[str, Any] = Field(default_factory=dict)
    max_history_tokens: int = 20

    def add_message(self, message: ChatMessage) -> None:
        self.history.append(message)
        # Apply sliding window context
        if len(self.history) > self.max_history_tokens:
            self.history = self.history[-self.max_history_tokens:]

    def set_symbol(self, symbol: str) -> None:
        self.current_symbol = symbol.upper()

class ConversationManager:
    """In-memory thread-safe conversation context manager."""

    def __init__(self):
        self._contexts: Dict[str, ConversationContext] = {}

    def get_or_create(self, session_id: str, user_id: str = "default_analyst") -> ConversationContext:
        if session_id not in self._contexts:
            self._contexts[session_id] = ConversationContext(session_id=session_id, user_id=user_id)
        return self._contexts[session_id]

    def get_history(self, session_id: str) -> List[ChatMessage]:
        ctx = self.get_or_create(session_id)
        return ctx.history

    def clear_session(self, session_id: str) -> None:
        if session_id in self._contexts:
            del self._contexts[session_id]

conversation_manager = ConversationManager()

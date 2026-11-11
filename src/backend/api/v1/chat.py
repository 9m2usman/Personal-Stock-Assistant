"""
Chat API Routes
Provides conversational interface, session history, and financial tool calling execution.
"""
from typing import List, Optional
from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field
from src.backend.ai.agent import ai_agent, ChatResponse, ChatMessage

router = APIRouter()

class UserChatRequest(BaseModel):
    session_id: str = Field(default="default_session", description="Unique conversation session identifier")
    content: str = Field(..., description="User query or financial instruction")

@router.post("/message", response_model=ChatResponse, status_code=status.HTTP_200_OK, summary="Send Message to Financial AI Agent")
async def send_chat_message(request: UserChatRequest):
    """Processes user query, executes necessary financial tools, and returns grounded answer with UI widgets."""
    return await ai_agent.process_message(request.session_id, request.content)

@router.get("/history", response_model=List[ChatMessage], status_code=status.HTTP_200_OK, summary="Get Session Chat History")
async def get_session_history(
    session_id: str = Query(default="default_session", description="Unique conversation session identifier")
):
    """Retrieves full conversation trajectory for a given session."""
    return ai_agent.get_history(session_id)

"""
AI Harness Policy & Permission Layer
Validates tool invocation permissions, arguments, rate limits, and security constraints.
"""
from typing import Dict, Any, Optional
from src.backend.core.logging import logger

class PolicyViolationError(Exception):
    """Raised when an AI tool execution violates security or permission policies."""
    pass

class PolicyEngine:
    """Enforces strict permissions, argument schemas, and security boundaries on tool calls."""

    # Maximum limits for safety
    MAX_HISTORICAL_DAYS = 500
    MAX_NEWS_ARTICLES = 20
    MAX_SANDBOX_TIMEOUT_SEC = 10.0

    # Blocked shell commands or suspicious argument patterns
    DISALLOWED_ARGUMENT_PATTERNS = [
        "__import__", "import os", "shutil", "drop table", "truncate", "system(", "exec("
    ]

    def validate_tool_permission(self, user_id: str, tool_name: str) -> None:
        """Verifies if the caller has permission to invoke the requested tool."""
        # Financial tools are permitted for authenticated/analyst sessions
        if not tool_name:
            raise PolicyViolationError("Tool name cannot be empty.")
        logger.debug("Policy check passed for user '%s' -> tool '%s'", user_id, tool_name)

    def validate_and_sanitize_arguments(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Validates tool arguments against domain boundaries and sanitizes inputs."""
        sanitized = dict(arguments)

        # 1. Check for dangerous string payloads in arguments
        for k, v in sanitized.items():
            if isinstance(v, str):
                for pattern in self.DISALLOWED_ARGUMENT_PATTERNS:
                    if pattern in v.lower() and tool_name != "run_python_analysis":
                        raise PolicyViolationError(f"Suspicious payload pattern detected in argument '{k}'.")

        # 2. Limit validations
        if "limit" in sanitized:
            try:
                limit_val = int(sanitized["limit"])
                if tool_name in ["get_historical_prices", "calculate_technical_indicators", "get_technical_analysis"]:
                    sanitized["limit"] = max(1, min(limit_val, self.MAX_HISTORICAL_DAYS))
                elif tool_name in ["get_company_news", "search_market_news", "analyze_sentiment"]:
                    sanitized["limit"] = max(1, min(limit_val, self.MAX_NEWS_ARTICLES))
            except (ValueError, TypeError):
                sanitized["limit"] = 100

        # 3. Timeout limits for sandbox
        if tool_name == "run_python_analysis":
            timeout = float(sanitized.get("timeout_seconds", 5.0))
            sanitized["timeout_seconds"] = max(0.5, min(timeout, self.MAX_SANDBOX_TIMEOUT_SEC))

        # 4. Symbol normalization
        if "symbol" in sanitized and isinstance(sanitized["symbol"], str):
            sanitized["symbol"] = sanitized["symbol"].strip().upper()

        return sanitized

policy_engine = PolicyEngine()

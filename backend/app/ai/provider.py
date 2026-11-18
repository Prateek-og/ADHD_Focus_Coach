"""
Abstract Base Class for AI Provider.
"""

from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    @abstractmethod
    def generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Generate structured JSON response from LLM."""
        pass

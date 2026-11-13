"""
Ollama / Qwen AIProvider implementation for development.
"""
import json
from typing import Any

from app.ai.provider import AIProvider
from app.core.config import settings


class OllamaProvider(AIProvider):
    def __init__(self):
        import ollama

        self.client = ollama
        self.model = settings.OLLAMA_MODEL

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> dict[str, Any]:

        response = self.client.chat(
            model=self.model,
            format="json",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        # Print Qwen's exact response before parsing it as JSON.
        content = response.message.content
        print("\n========== QWEN RAW RESPONSE ==========")
        print(content)
        print("========== END QWEN RAW RESPONSE ======\n")

        if not content:
            raise ValueError("Ollama returned an empty response")

        result = json.loads(content)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object from Ollama")

        return result

"""
Gemini AIProvider implementation.
"""

import json
from typing import Any

from google import genai
from google.genai import types

from app.ai.provider import AIProvider
from app.core.config import settings


class OpenAIProvider(AIProvider):
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")

        self.client = genai.Client(
            api_key=settings.OPENAI_API_KEY
        )

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> dict[str, Any]:

        response = self.client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        content = response.text

        if not content:
            raise ValueError("Gemini returned an empty response")

        result = json.loads(content)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object from Gemini")

        return result
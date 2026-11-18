"""
OpenAI AIProvider implementation using GPT-4o-mini.
"""
import json
from typing import Any

from openai import OpenAI
from app.ai.provider import AIProvider
from app.core.config import settings


class OpenAIProvider(AIProvider):
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")

        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=30.0
        )

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> dict[str, Any]:

        response = self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError("OpenAI returned an empty response")

        result = json.loads(content)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object from OpenAI")

        return result
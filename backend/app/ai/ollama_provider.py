
import json
import logging
import time
from typing import Any

from app.ai.provider import AIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


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

        start = time.perf_counter()

        response = self.client.chat(
            model=self.model,
            format="json",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            options={
                "temperature": 0.3,
                "num_predict": 180,
                "num_ctx": 4096,
            },
            keep_alive="10m",
        )

        elapsed = time.perf_counter() - start

        # Ollama performance metrics (durations are nanoseconds)
        print("\n========== OLLAMA PERFORMANCE ==========")
        print(f"Total time: {elapsed:.2f}s")
        print(f"Model load: {response.load_duration / 1e9:.2f}s")
        print(f"Prompt processing: {response.prompt_eval_duration / 1e9:.2f}s")
        print(f"Generation: {response.eval_duration / 1e9:.2f}s")
        print(f"Prompt tokens: {response.prompt_eval_count}")
        print(f"Generated tokens: {response.eval_count}")

        if response.eval_count:
            speed = response.eval_count / (response.eval_duration / 1e9)
            print(f"Generation speed: {speed:.2f} tokens/sec")

        print("========================================\n")

        content = response.message.content

        if not content:
            raise ValueError("Ollama returned an empty response")

        result = json.loads(content)

        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object from Ollama")

        return result

from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from nemoguardrails import LLMRails, RailsConfig
from nemoguardrails.rails.llm.options import RailStatus, RailType


CONFIG_PATH = Path(__file__).parent / "config"


@lru_cache(maxsize=1)
def get_guardrails() -> LLMRails:
    config = RailsConfig.from_path(str(CONFIG_PATH))
    return LLMRails(config)


class GuardrailsService:

    @staticmethod
    def check_input(text: str) -> None:
        try:
            rails = get_guardrails()

            result = rails.check(
                messages=[{"role": "user", "content": text}],
                rail_types=[RailType.INPUT],
            )

            if result.status == RailStatus.BLOCKED:
                raise HTTPException(
                    status_code=400,
                    detail="Request blocked by safety policies.",
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail="Safety validation is unavailable.",
            ) from e

    @staticmethod
    def check_output(text: str) -> None:
        try:
            rails = get_guardrails()

            result = rails.check(
                messages=[{"role": "assistant", "content": text}],
                rail_types=[RailType.OUTPUT],
            )

            if result.status == RailStatus.BLOCKED:
                raise HTTPException(
                    status_code=502,
                    detail="AI output failed safety validation.",
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail="Safety validation is unavailable.",
            ) from e
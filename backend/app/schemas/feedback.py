from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


TaskDifficulty = Literal[
    "SUPER_EASY",
    "A_LITTLE_EASY",
    "JUST_OKAY",
    "A_LITTLE_DIFFICULT",
    "VERY_DIFFICULT",
]
HardestPart = Literal[
    "GETTING_STARTED",
    "UNDERSTANDING",
    "STAYING_FOCUSED",
    "REMEMBERING_NEXT_STEP",
    "NOTHING_DIFFICULT",
]
HelpedBy = Literal[
    "SMALL_STEPS",
    "TIMER",
    "ENCOURAGEMENT",
    "SHORT_BREAKS",
    "QUIET_SPACE",
]
InstructionClarity = Literal[
    "VERY_CLEAR",
    "MOSTLY_CLEAR",
    "NEEDED_EXPLANATION",
    "NEEDED_REPETITION",
    "UNCLEAR",
]
FocusLevel = Literal[
    "ALMOST_WHOLE_TIME",
    "MOST_OF_THE_TIME",
    "SOMETIMES",
    "LITTLE_OF_THE_TIME",
    "HARD_TO_FOCUS",
]
WhenStuck = Literal[
    "TRIED_AGAIN",
    "CHECKED_INSTRUCTIONS",
    "ASKED_FOR_HELP",
    "TOOK_A_BREAK",
    "DID_NOT_KNOW_WHAT_TO_DO",
]
NextTime = Literal[
    "SMALLER_STEPS",
    "TIMER",
    "MORE_BREAKS",
    "MORE_ENCOURAGEMENT",
    "NO_CHANGE",
]


class FeedbackCreate(BaseModel):
    """Structured answers from the post-task questionnaire.

    task_id comes from the URL (/tasks/{task_id}/feedback), so it is not
    duplicated in the request body. All answers are optional to allow skips.
    """

    task_difficulty: TaskDifficulty | None = None
    hardest_part: HardestPart | None = None
    helped_by: HelpedBy | None = None
    instruction_clarity: InstructionClarity | None = None
    focus_level: FocusLevel | None = None
    when_stuck: WhenStuck | None = None
    next_time: NextTime | None = None

    @model_validator(mode="after")
    def require_at_least_one_answer(self):
        answer_fields = (
            "task_difficulty",
            "hardest_part",
            "helped_by",
            "instruction_clarity",
            "focus_level",
            "when_stuck",
            "next_time",
        )
        if not any(getattr(self, field) is not None for field in answer_fields):
            raise ValueError("At least one feedback answer is required")
        return self


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    task_id: int
    task_difficulty: str | None
    hardest_part: str | None
    helped_by: str | None
    instruction_clarity: str | None
    focus_level: str | None
    when_stuck: str | None
    next_time: str | None
    # Returned for compatibility with rows created before this questionnaire.
    feeling: str | None = None
    difficulty: str | None = None
    created_at: datetime

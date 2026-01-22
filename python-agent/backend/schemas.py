from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class ProblemMetadata(BaseModel):
    file_name: str
    language: str
    line_count: int

class SessionSignals(BaseModel):
    edit_churn_score: float
    boundary_error_density: float
    refactor_frequency: float
    abandoned_attempt_count: int
    planning_time_ratio: float
    data_structure_switch_count: float
    error_distribution: Dict[str, int]
    idle_time_seconds: float
    total_edits: int
    save_count: int
    undo_redo_density: float
    cursor_jumps: int

class FeedbackRequest(BaseModel):
    problem_metadata: ProblemMetadata
    code_snapshot: str = Field(..., description="Trimmed code snapshot")
    session_signals: SessionSignals
    user_id: str

class ObservedIssue(BaseModel):
    issue: str
    evidence: str
    impact: str

class PedagogicalFeedback(BaseModel):
    session_summary: str
    observed_strengths: List[str]
    observed_issues: List[ObservedIssue]
    process_feedback: List[str]
    learning_suggestions: List[str]
    reflection_questions: List[str]

class LearnerProfile(BaseModel):
    user_id: str
    repeated_gaps: List[str] = Field(default_factory=list)
    antipatterns: List[str] = Field(default_factory=list)
    topic_competencies: Dict[str, float] = Field(default_factory=dict)
    total_sessions: int = 0
    last_updated: Optional[str] = None
    session_history: List[Dict] = Field(default_factory=list)

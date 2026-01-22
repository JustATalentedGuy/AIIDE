# python-backend/app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from schemas import FeedbackRequest, PedagogicalFeedback
from feedback_generator import FeedbackGenerator
from llm_orchestrator import LLMOrchestrator

load_dotenv()

app = FastAPI(
    title="AI Learning Coach Backend",
    description="Pedagogical feedback engine for competitive programming",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
llm_orchestrator = LLMOrchestrator()
feedback_generator = FeedbackGenerator(llm_orchestrator)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "AI Learning Coach Backend"}

@app.post("/api/feedback", response_model=PedagogicalFeedback)
async def request_feedback(request: FeedbackRequest):
    """
    Request pedagogical feedback.
    
    Accepts:
    - Problem metadata (file name, language, line count)
    - Code snapshot (trimmed)
    - Session signals (compressed behavioral data)
    - User ID (for profile tracking)
    
    Returns:
    - Pedagogical feedback with strengths, issues, and reflection questions
    """
    try:
        feedback = feedback_generator.generate(request)
        return feedback
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile/{user_id}")
async def record_profile(user_id: str, profile_data: dict):
    """
    Record user profile updates.
    
    Tracks:
    - Repeated conceptual gaps
    - Common antipatterns
    - Topic competencies
    """
    try:
        profile = feedback_generator.session_manager.get_learner_profile(user_id)
        # Profile already tracked via update_profile_with_feedback
        return {
            "user_id": user_id,
            "total_sessions": profile.total_sessions,
            "last_updated": profile.last_updated,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    """Get learner profile summary."""
    try:
        profile = feedback_generator.session_manager.get_learner_profile(user_id)
        return {
            "user_id": user_id,
            "total_sessions": profile.total_sessions,
            "repeated_gaps": profile.repeated_gaps[-5:],  # Last 5
            "antipatterns": profile.antipatterns[-5:],
            "competencies": profile.topic_competencies,
            "last_updated": profile.last_updated,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

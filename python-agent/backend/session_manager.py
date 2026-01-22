# python-backend/session_manager.py
from datetime import datetime
from typing import Dict, List
from schemas import LearnerProfile

class SessionManager:
    """Manages session memory and learner profiles."""
    
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.profiles: Dict[str, LearnerProfile] = {}
    
    def start_session(self, user_id: str, problem_metadata: dict) -> str:
        """Start a new coding session."""
        session_id = f"{user_id}_{datetime.now().timestamp()}"
        
        self.sessions[session_id] = {
            "user_id": user_id,
            "start_time": datetime.now(),
            "problem_metadata": problem_metadata,
            "signals_history": [],
            "feedback_requests": [],
        }
        
        return session_id
    
    def record_signals(self, session_id: str, signals: dict):
        """Record signals for current session."""
        if session_id in self.sessions:
            self.sessions[session_id]["signals_history"].append({
                "timestamp": datetime.now().isoformat(),
                "signals": signals,
            })
    
    def get_learner_profile(self, user_id: str) -> LearnerProfile:
        """Get or create learner profile."""
        if user_id not in self.profiles:
            self.profiles[user_id] = LearnerProfile(user_id=user_id)
        
        return self.profiles[user_id]
    
    def update_profile_with_feedback(self, user_id: str, feedback_data: dict, signals: dict):
        """Update learner profile based on feedback."""
        profile = self.get_learner_profile(user_id)
        
        # Detect repeated gaps
        if "observed_issues" in feedback_data:
            for issue in feedback_data["observed_issues"]:
                if issue["issue"] not in profile.repeated_gaps:
                    profile.repeated_gaps.append(issue["issue"])
        
        # Detect antipatterns
        if "process_feedback" in feedback_data:
            profile.antipatterns.extend(feedback_data["process_feedback"])
        
        # Update competencies based on signals
        if signals.get("boundary_error_density", 0) > 0.3:
            profile.topic_competencies["boundary_conditions"] = \
                profile.topic_competencies.get("boundary_conditions", 0.5) - 0.1
        
        if signals.get("edit_churn_score", 0) > 0.4:
            profile.topic_competencies["code_clarity"] = \
                profile.topic_competencies.get("code_clarity", 0.5) - 0.1
        
        profile.total_sessions += 1
        profile.last_updated = datetime.now().isoformat()
        
        # Keep last 20 sessions in history
        profile.session_history.append({
            "timestamp": datetime.now().isoformat(),
            "signals": signals,
        })
        profile.session_history = profile.session_history[-20:]
    
    def get_historical_context(self, user_id: str) -> dict:
        """Get historical context for learner."""
        profile = self.get_learner_profile(user_id)
        
        return {
            "repeated_gaps": profile.repeated_gaps[-3:],  # Last 3 gaps
            "common_antipatterns": profile.antipatterns[-3:],
            "competency_summary": profile.topic_competencies,
            "total_sessions": profile.total_sessions,
        }
    
    def close_session(self, session_id: str):
        """Mark session as complete."""
        if session_id in self.sessions:
            self.sessions[session_id]["end_time"] = datetime.now()

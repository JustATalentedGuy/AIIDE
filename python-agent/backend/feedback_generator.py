# python-backend/feedback_generator.py
from typing import Dict, Any
from schemas import PedagogicalFeedback, FeedbackRequest
from session_manager import SessionManager
from signal_processor import SignalProcessor
from llm_orchestrator import LLMOrchestrator

class FeedbackGenerator:
    """Orchestrates the full feedback pipeline."""
    
    def __init__(self, llm_orchestrator: LLMOrchestrator):
        self.session_manager = SessionManager()
        self.signal_processor = SignalProcessor()
        self.llm_orchestrator = llm_orchestrator
    
    def generate(self, request: FeedbackRequest) -> PedagogicalFeedback:
        """
        Generate pedagogical feedback from a feedback request.
        
        Pipeline:
        1. Start/retrieve session
        2. Process signals
        3. Detect patterns
        4. Fetch historical context
        5. Call LLM
        6. Update learner profile
        7. Return feedback
        """
        
        # Step 1: Session management
        session_id = self.session_manager.start_session(
            request.user_id,
            request.problem_metadata.model_dump(),
        )
        
        # Step 2: Process signals
        compressed_signals = self.signal_processor.compress_signals(request.session_signals)
        patterns = self.signal_processor.detect_patterns(request.session_signals)
        
        # Step 3: Get historical context
        historical_context = self.session_manager.get_historical_context(request.user_id)
        
        # Step 4: Call LLM
        feedback = self.llm_orchestrator.generate_feedback(
            code_snapshot=request.code_snapshot,
            signals_summary=compressed_signals,
            patterns=patterns,
            historical_context=historical_context,
            problem_metadata=request.problem_metadata.model_dump(),
        )
        
        # Step 5: Update learner profile
        self.session_manager.update_profile_with_feedback(
            request.user_id,
            feedback.model_dump(),
            request.session_signals.model_dump(),
        )
        
        # Step 6: Close session
        self.session_manager.close_session(session_id)
        
        return feedback

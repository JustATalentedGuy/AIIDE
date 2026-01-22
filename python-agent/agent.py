import sys
import json
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

print(json.dumps({'status': 'agent_startup'}), flush=True)

# Import from local backend
try:
    from schemas import FeedbackRequest, ProblemMetadata, SessionSignals, PedagogicalFeedback
    from signal_processor import SignalProcessor
    from session_manager import SessionManager
    from llm_orchestrator import LLMOrchestrator
    from feedback_generator import FeedbackGenerator
    print(json.dumps({'imports': 'success'}), flush=True)
except ImportError as e:
    print(json.dumps({'imports': 'failed', 'error': str(e)}), flush=True)
    sys.exit(1)


class AgentServer:
    """Full LLM-integrated agent server."""
    
    def __init__(self):
        try:
            self.llm = LLMOrchestrator()
            self.feedback_gen = FeedbackGenerator(self.llm)
            self.signal_processor = SignalProcessor()
            print(json.dumps({'llm': 'ready'}), flush=True)
        except Exception as e:
            print(json.dumps({'llm': 'error', 'reason': str(e)}), flush=True)
            self.llm = None
            self.feedback_gen = None

    def handle_request(self, request):
        """Route requests to appropriate handlers."""
        if request.get('type') == 'health':
            return {
                'success': True,
                'data': {
                    'status': 'alive',
                    'llm_ready': self.llm is not None
                }
            }
        elif request.get('type') == 'feedback':
            return self.handle_feedback_request(request.get('payload', {}))
        else:
            return {'success': False, 'error': 'Unknown request type'}

    def handle_feedback_request(self, payload):
        """
        Full pipeline: payload → signals → patterns → LLM → feedback
        
        Payload structure:
        {
          'user_id': 'user123',
          'problem_context': {
            'file_name': 'solution.py',
            'language': 'python',
            'line_count': 120
          },
          'session_signals': {
            'edit_churn_score': 0.45,
            'boundary_error_density': 0.2,
            ...
          },
          'code_snapshot': 'def solve():\n  ...',
          'learner_profile': {}  # optional
        }
        """
        try:
            # Extract payload fields
            user_id = payload.get('user_id', 'anonymous')
            problem_context = payload.get('problem_context', {})
            raw_signals = payload.get('session_signals', {})
            code_snapshot = payload.get('code_snapshot', '')
            
            # Validate problem context
            if not problem_context:
                return self._error('Missing problem_context')
            
            # Create ProblemMetadata
            try:
                problem_metadata = ProblemMetadata(
                    file_name=problem_context.get('file_name', 'code.py'),
                    language=problem_context.get('language', 'python'),
                    line_count=problem_context.get('line_count', 0)
                )
            except Exception as e:
                return self._error(f'Invalid problem_context: {str(e)}')
            
            # Create SessionSignals
            try:
                session_signals = SessionSignals(
                    edit_churn_score=float(raw_signals.get('edit_churn_score', 0.0)),
                    boundary_error_density=float(raw_signals.get('boundary_error_density', 0.0)),
                    refactor_frequency=float(raw_signals.get('refactor_frequency', 0.0)),
                    abandoned_attempt_count=int(raw_signals.get('abandoned_attempt_count', 0)),
                    planning_time_ratio=float(raw_signals.get('planning_time_ratio', 0.0)),
                    data_structure_switch_count=int(raw_signals.get('data_structure_switch_count', 0)),
                    error_distribution=raw_signals.get('error_distribution', {}),
                    idle_time_seconds=float(raw_signals.get('idle_time_seconds', 0.0)),
                    total_edits=int(raw_signals.get('total_edits', 0)),
                    save_count=int(raw_signals.get('save_count', 0)),
                    undo_redo_density=float(raw_signals.get('undo_redo_density', 0.0)),
                    cursor_jumps=int(raw_signals.get('cursor_jumps', 0))
                )
            except Exception as e:
                return self._error(f'Invalid session_signals: {str(e)}')
            
            # Create FeedbackRequest
            feedback_request = FeedbackRequest(
                problem_metadata=problem_metadata,
                code_snapshot=code_snapshot,
                session_signals=session_signals,
                user_id=user_id
            )
            
            # Generate feedback via full pipeline
            feedback = self.feedback_gen.generate(feedback_request)
            
            # Convert Pydantic model to dict
            feedback_dict = feedback.model_dump() if hasattr(feedback, 'model_dump') else feedback
            
            return {
                'success': True,
                'data': {
                    'feedback': feedback_dict
                }
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return self._error(f'Feedback generation failed: {str(e)}')

    @staticmethod
    def _error(message):
        return {
            'success': False,
            'error': message
        }


def main():
    """Main loop: read JSON from stdin, respond to stdout."""
    agent = AgentServer()
    
    for line in sys.stdin:
        if not line.strip():
            continue
        
        try:
            request = json.loads(line.strip())
            response = agent.handle_request(request)
            print(json.dumps(response), flush=True)
        except json.JSONDecodeError as e:
            print(json.dumps({'success': False, 'error': f'Invalid JSON: {str(e)}'}), flush=True)
        except Exception as e:
            print(json.dumps({'success': False, 'error': str(e)}), flush=True)


if __name__ == '__main__':
    main()
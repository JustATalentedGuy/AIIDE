import os
import json
from typing import Dict, Any
from groq import Groq
from schemas import PedagogicalFeedback, ObservedIssue
from dotenv import load_dotenv

load_dotenv()

class LLMOrchestrator:
    """Manages LLM interaction with strict schema enforcement."""
    
    def __init__(self, api_key: str = None):
        self.client = Groq(api_key=api_key or os.getenv("GROQ_API_KEY"))
        self.model = "openai/gpt-oss-120b"
    
    def generate_feedback(
        self,
        code_snapshot: str,
        signals_summary: Dict[str, Any],
        patterns: Dict[str, str],
        historical_context: Dict[str, Any],
        problem_metadata: Dict[str, Any],
    ) -> PedagogicalFeedback:
        """
        Generate pedagogical feedback via LLM.
        
        Enforces strict JSON schema for safety.
        """
        
        prompt = self._build_prompt(
            code_snapshot=code_snapshot,
            signals_summary=signals_summary,
            patterns=patterns,
            historical_context=historical_context,
            problem_metadata=problem_metadata,
        )
        
        try:
            message = self.client.chat.completions.create(
                model=self.model,
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )

            # Groq chat completion response structure
            response_text = message.choices[0].message.content

            
            # Parse and validate JSON response
            feedback_dict = json.loads(response_text)
            feedback = PedagogicalFeedback(**feedback_dict)
            
            return feedback
            
        except json.JSONDecodeError as e:
            return self._fallback_feedback(
                "Failed to parse LLM response. Please try again.",
                patterns,
            )
        except Exception as e:
            return self._fallback_feedback(
                f"Error generating feedback: {str(e)}",
                patterns,
            )
    
    def _build_prompt(
        self,
        code_snapshot: str,
        signals_summary: Dict[str, Any],
        patterns: Dict[str, str],
        historical_context: Dict[str, Any],
        problem_metadata: Dict[str, Any],
    ) -> str:
        """Build the LLM prompt with context."""
        
        return f"""You are an AI learning coach. Your role is to provide pedagogical feedback based on a student's coding behavior—NOT to provide solutions or hints.

STUDENT CODE ({problem_metadata['language']}):
```
{code_snapshot[:1000]}
```

BEHAVIORAL SIGNALS:
- Edit Churn: {signals_summary['code_construction']['edit_churn']} (Frequency of reworking code)
- Boundary Errors: {signals_summary['error_patterns']['boundary_error_density']} (Proportion of off-by-one errors)
- Refactoring: {signals_summary['code_construction']['refactor_frequency']} (Code reorganization activity)
- Planning Time: {signals_summary['working_style']['planning_time_ratio']} (Ratio of planning before coding)
- Idle Time: {signals_summary['working_style']['idle_time_seconds']}s (Time stuck or debugging)

DETECTED PATTERNS:
{json.dumps(patterns, indent=2)}

STUDENT HISTORY:
- Total sessions: {historical_context['total_sessions']}
- Previous gaps: {historical_context['repeated_gaps']}
- Common antipatterns: {historical_context['common_antipatterns']}

YOUR TASK:
Generate **pedagogical feedback** that:
1. Names the thinking patterns you observe
2. Explains WHY these patterns matter for learning
3. Suggests learning exercises (NO solutions)
4. Poses reflection questions to encourage self-diagnosis

CRITICAL CONSTRAINTS:
- NO code corrections or fixes
- NO algorithm hints or implementations
- Focus on PROCESS, not correctness
- Encourage self-reflection and concept repair

Return ONLY valid JSON matching this schema:
{{
  "session_summary": "Brief 1-2 sentence overview of the session",
  "observed_strengths": [
    "Specific strength #1",
    "Specific strength #2"
  ],
  "observed_issues": [
    {{
      "issue": "Issue name",
      "evidence": "What signals indicate this",
      "impact": "Why this matters for learning"
    }}
  ],
  "process_feedback": [
    "Observation about coding process #1",
    "Observation about coding process #2"
  ],
  "learning_suggestions": [
    "Exercise or practice suggestion #1",
    "Exercise or practice suggestion #2"
  ],
  "reflection_questions": [
    "Question to promote self-diagnosis #1",
    "Question to promote self-diagnosis #2"
  ]
}}
"""
    
    def _fallback_feedback(self, error_msg: str, patterns: Dict[str, str]) -> PedagogicalFeedback:
        """Return fallback feedback when LLM fails."""
        return PedagogicalFeedback(
            session_summary=error_msg,
            observed_strengths=["Unable to analyze this session."],
            observed_issues=[],
            process_feedback=["Please ensure the backend is configured correctly."],
            learning_suggestions=["Try again or check your Groq API key."],
            reflection_questions=["What was your approach to solving this problem?"],
        )

# python-backend/signal_processor.py
from typing import Dict, Any
from schemas import SessionSignals

class SignalProcessor:
    """Processes and aggregates raw signals into higher-level insights."""
    
    @staticmethod
    def compress_signals(signals: SessionSignals) -> Dict[str, Any]:
        """Convert signals to interpretable form for LLM."""
        return {
            "code_construction": {
                "edit_churn": round(signals.edit_churn_score, 3),
                "refactor_frequency": round(signals.refactor_frequency, 3),
                "abandoned_attempts": signals.abandoned_attempt_count,
            },
            "error_patterns": {
                "boundary_error_density": round(signals.boundary_error_density, 3),
                "error_types": signals.error_distribution,
            },
            "working_style": {
                "planning_time_ratio": round(signals.planning_time_ratio, 3),
                "idle_time_seconds": round(signals.idle_time_seconds, 1),
                "undo_redo_density": round(signals.undo_redo_density, 3),
            },
            "activity_summary": {
                "total_edits": signals.total_edits,
                "save_count": signals.save_count,
                "cursor_jumps": signals.cursor_jumps,
                "ds_switches": signals.data_structure_switch_count,
            },
        }
    
    @staticmethod
    def detect_patterns(signals: SessionSignals) -> Dict[str, str]:
        """Detect high-level coding patterns."""
        patterns = {}
        
        # Edit Churn Pattern
        if signals.edit_churn_score > 0.5:
            patterns["edit_churn"] = "High - Revisiting and reworking code frequently"
        elif signals.edit_churn_score > 0.2:
            patterns["edit_churn"] = "Moderate - Some rework and refinement"
        else:
            patterns["edit_churn"] = "Low - Mostly incremental changes"
        
        # Boundary Error Pattern
        if signals.boundary_error_density > 0.4:
            patterns["boundary_errors"] = "Frequent - Off-by-one and boundary issues"
        elif signals.boundary_error_density > 0.15:
            patterns["boundary_errors"] = "Occasional - Some boundary concerns"
        else:
            patterns["boundary_errors"] = "Rare - Strong boundary condition handling"
        
        # Planning Pattern
        if signals.planning_time_ratio > 0.6:
            patterns["planning"] = "Extended planning phase before coding"
        elif signals.planning_time_ratio > 0.2:
            patterns["planning"] = "Balanced planning and coding time"
        else:
            patterns["planning"] = "Immediate coding - minimal planning observed"
        
        # Idle Pattern
        if signals.idle_time_seconds > 300:
            patterns["idle"] = "Significant idle time - possible stuck points"
        elif signals.idle_time_seconds > 60:
            patterns["idle"] = "Moderate idle time - some debugging pauses"
        else:
            patterns["idle"] = "Minimal idle time - active throughout"
        
        # Refactoring Pattern
        if signals.refactor_frequency > 2.0:
            patterns["refactoring"] = "High refactor activity - code reorganization"
        elif signals.refactor_frequency > 0.5:
            patterns["refactoring"] = "Moderate refactoring between saves"
        else:
            patterns["refactoring"] = "Minimal refactoring - first-draft approach"
        
        return patterns
    
    @staticmethod
    def identify_skill_areas(signals: SessionSignals) -> Dict[str, str]:
        """Identify areas for skill development."""
        areas = []
        
        if signals.boundary_error_density > 0.3:
            areas.append("boundary_conditions")
        
        if signals.edit_churn_score > 0.4:
            areas.append("code_clarity")
        
        if signals.abandoned_attempt_count > 2:
            areas.append("problem_decomposition")
        
        if signals.idle_time_seconds > 300:
            areas.append("debugging_strategy")
        
        if signals.data_structure_switch_count > 2:
            areas.append("data_structure_selection")
        
        if signals.undo_redo_density > 0.3:
            areas.append("editing_efficiency")
        
        return {"focus_areas": areas}

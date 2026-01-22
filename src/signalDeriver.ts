import { generateASTFingerprint, sanitizeFingerprint, ASTFingerprint } from './ast/astAnalyzer';
import { diffAST, classifyRefactor, ASTDiffResult } from './ast/astDiff';
import { ASTSnapshot, ASTRefactorEvent } from './ast/astSnapshot';

export interface SessionSignals {
  edit_churn_score: number;
  boundary_error_density: number;
  refactor_frequency: number;
  abandoned_attempt_count: number;
  planning_time_ratio: number;
  data_structure_switch_count: number;
  error_distribution: Record<string, number>;
  idle_time_seconds: number;
  total_edits: number;
  save_count: number;
  undo_redo_density: number;
  cursor_jumps: number;
}

interface EditEvent {
  type: 'insertion' | 'deletion';
  length: number;
  position: number;
  timeSinceLastEdit: number;
  timestamp: number;
}

interface ErrorEvent {
  type: 'error' | 'warning';
  message: string;
  line: number;
  category: string;
}

interface EditBurst {
  edits: EditEvent[];
  startTime: number;
  endTime: number;
}

export class SignalDeriver {
  private sessionStart = Date.now();
  private edits: EditEvent[] = [];
  private errors: ErrorEvent[] = [];
  private saves = 0;
  private idleTime = 0;
  private cursorJumps = 0;
  private undoRedoEvents = 0;

  // AST-based refactor tracking
  private astSnapshots: ASTSnapshot[] = [];
  private astRefactorEvents: ASTRefactorEvent[] = [];
  private lastASTSnapshot: ASTSnapshot | null = null;

  recordEdit(event: EditEvent) {
    this.edits.push(event);
  }

  recordError(event: ErrorEvent) {
    this.errors.push(event);
  }

  recordSave() {
    this.saves++;
  }

  recordIdleTime(duration: number) {
    this.idleTime += duration;
  }

  recordCursorMovement(selectionCount: number) {
    if (selectionCount > 1) this.cursorJumps++;
  }

  recordUndoRedo() {
    this.undoRedoEvents++;
  }

  /**
   * Called when code is saved or burst ends.
   * Generates AST fingerprint and detects refactors.
   */
  recordASTSnapshot(code: string, timestamp: number = Date.now()) {
    try {
      const fingerprint = generateASTFingerprint(code);
      const sanitized = sanitizeFingerprint(fingerprint);

      const snapshot: ASTSnapshot = {
        timestamp,
        fingerprint: sanitized,
        code,
      };

      // Compare with last snapshot
      if (this.lastASTSnapshot) {
        const diff = diffAST(this.lastASTSnapshot.fingerprint, sanitized);

        if (diff.majorChange) {
          const refactorType = classifyRefactor(diff);
          const refactorEvent: ASTRefactorEvent = {
            timestamp,
            type: refactorType,
            score: diff.structuralChangeScore,
            before: this.lastASTSnapshot.fingerprint,
            after: sanitized,
          };
          this.astRefactorEvents.push(refactorEvent);
        }
      }

      this.astSnapshots.push(snapshot);
      this.lastASTSnapshot = snapshot;
    } catch (error) {
      console.warn('AST snapshot recording failed:', error);
      // Continue gracefully if AST analysis fails
    }
  }

  /* ---------------- CORE SIGNALS ---------------- */

  getSessionSignals(): SessionSignals {
    const bursts = this.computeEditBursts();

    return {
      edit_churn_score: this.calculateEditChurn(bursts),
      boundary_error_density: this.calculateBoundaryErrorDensity(),
      refactor_frequency: this.calculateRefactorFrequency(),
      abandoned_attempt_count: this.calculateAbandonedAttempts(bursts),
      planning_time_ratio: this.calculatePlanningTimeRatio(),
      data_structure_switch_count: this.detectDataStructureSwitches(),
      error_distribution: this.getErrorDistribution(),
      idle_time_seconds: this.idleTime / 1000,
      total_edits: this.edits.length,
      save_count: this.saves,
      undo_redo_density: this.undoRedoEvents / Math.max(this.edits.length, 1),
      cursor_jumps: this.cursorJumps,
    };
  }

  /* ---------------- BURST LOGIC ---------------- */

  private computeEditBursts(): EditBurst[] {
    const bursts: EditBurst[] = [];
    let current: EditBurst | null = null;

    for (const e of this.edits) {
      if (!current || e.timeSinceLastEdit > 1200) {
        current = { edits: [e], startTime: e.timestamp, endTime: e.timestamp };
        bursts.push(current);
      } else {
        current.edits.push(e);
        current.endTime = e.timestamp;
      }
    }
    return bursts;
  }

  /* ---------------- METRICS ---------------- */

  private calculateEditChurn(bursts: EditBurst[]): number {
    if (bursts.length === 0) return 0;

    let churnBursts = 0;

    for (const b of bursts) {
      const totalMagnitude = b.edits.reduce((s, e) => s + e.length, 0);
      const uniquePositions = new Set(b.edits.map(e => e.position)).size;

      // Ignore typo-level bursts
      if (totalMagnitude <= 4) continue;

      // High repetition on same positions
      if (b.edits.length >= 6 && uniquePositions <= 2) {
        churnBursts++;
      }
    }

    return churnBursts / bursts.length;
  }

  /**
   * AST-aware refactor frequency.
   * Based on detected structural changes, not heuristics.
   */
  private calculateRefactorFrequency(): number {
    if (this.astSnapshots.length <= 1) return 0;

    // Each refactor event counts as 1 refactor
    // Normalized by number of snapshots
    return this.astRefactorEvents.length / this.astSnapshots.length;
  }

  private calculateAbandonedAttempts(bursts: EditBurst[]): number {
    let abandoned = 0;

    for (let i = 1; i < bursts.length; i++) {
      const prev = bursts[i - 1];
      const curr = bursts[i];

      const prevDeletion = prev.edits.some(e => e.type === 'deletion' && e.length >= 20);
      const longPause = curr.startTime - prev.endTime > 3000;

      if (prevDeletion && longPause) abandoned++;
    }

    return abandoned;
  }

  private calculatePlanningTimeRatio(): number {
    if (this.edits.length === 0) return 0;

    const firstEdit = this.edits[0].timestamp;
    const totalTime = Date.now() - this.sessionStart;

    const planningTime = firstEdit - this.sessionStart;
    return Math.min(planningTime / Math.max(totalTime, 1), 1);
  }

  private calculateBoundaryErrorDensity(): number {
    if (this.errors.length === 0) return 0;

    const boundaryErrors = this.errors.filter(e =>
      e.category === 'boundary_error' || e.category === 'off_by_one'
    ).length;

    return boundaryErrors / this.errors.length;
  }

  /**
   * Detects explicit data structure switches from AST refactor events.
   * Conservative: only counts if refactor type suggests DS change.
   */
  private detectDataStructureSwitches(): number {
    const dsRefactorTypes = ['loop_restructure', 'conditional_restructure'];
    
    return this.astRefactorEvents.filter(e =>
      dsRefactorTypes.includes(e.type)
    ).length;
  }

  private getErrorDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const e of this.errors) {
      dist[e.category] = (dist[e.category] || 0) + 1;
    }
    return dist;
  }

  /**
   * Debug method: get all detected refactor events
   */
  getRefactorEvents(): ASTRefactorEvent[] {
    return this.astRefactorEvents;
  }

  /**
   * Debug method: get all AST snapshots
   */
  getASTSnapshots(): ASTSnapshot[] {
    return this.astSnapshots;
  }

  resetSession() {
    this.sessionStart = Date.now();
    this.edits = [];
    this.errors = [];
    this.saves = 0;
    this.idleTime = 0;
    this.cursorJumps = 0;
    this.undoRedoEvents = 0;

    // Reset AST tracking
    this.astSnapshots = [];
    this.astRefactorEvents = [];
    this.lastASTSnapshot = null;
  }
}
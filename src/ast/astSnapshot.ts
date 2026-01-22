import { ASTFingerprint } from './astAnalyzer';

export interface ASTSnapshot {
  timestamp: number;
  fingerprint: ASTFingerprint;
  code: string; // For debugging
}

export interface ASTRefactorEvent {
  timestamp: number;
  type: string; // 'extract_function', 'loop_restructure', etc.
  score: number;
  before: ASTFingerprint;
  after: ASTFingerprint;
}
// vscode-extension/src/ast/astDiff.ts

import { ASTFingerprint } from './astAnalyzer';

export interface ASTDiffResult {
  structuralChangeScore: number;
  majorChange: boolean;
  details: {
    addedNodes: Record<string, number>;
    removedNodes: Record<string, number>;
    changedNodes: Record<string, number>;
  };
}

/**
 * Computes structural diff between two AST fingerprints.
 * Returns:
 *  - structuralChangeScore: [0, 1] measure of change magnitude
 *  - majorChange: boolean, true if score >= 0.25
 *  - details: breakdown of added/removed/changed node types
 */
export function diffAST(
  prev: ASTFingerprint,
  curr: ASTFingerprint
): ASTDiffResult {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  
  let totalDelta = 0;
  let totalNodes = 0;
  const added: Record<string, number> = {};
  const removed: Record<string, number> = {};
  const changed: Record<string, number> = {};

  for (const key of allKeys) {
    const prevCount = prev[key] || 0;
    const currCount = curr[key] || 0;
    const delta = Math.abs(prevCount - currCount);

    totalDelta += delta;
    totalNodes += Math.max(prevCount, currCount);

    if (currCount > prevCount) {
      added[key] = currCount - prevCount;
    } else if (prevCount > currCount) {
      removed[key] = prevCount - currCount;
    }

    if (delta > 0) {
      changed[key] = delta;
    }
  }

  const structuralChangeScore = totalNodes === 0 ? 0 : totalDelta / totalNodes;

  return {
    structuralChangeScore,
    majorChange: structuralChangeScore >= 0.25, // Calibrated threshold
    details: {
      addedNodes: added,
      removedNodes: removed,
      changedNodes: changed,
    },
  };
}

/**
 * Classifies the type of refactor based on diff details.
 */
export function classifyRefactor(diff: ASTDiffResult): string {
  const { addedNodes, removedNodes } = diff.details;

  if (
    (addedNodes['FunctionDeclaration'] || 0) > 0 ||
    (addedNodes['ArrowFunction'] || 0) > 0
  ) {
    return 'extract_function';
  }

  if (
    (removedNodes['FunctionDeclaration'] || 0) > 0 ||
    (removedNodes['ArrowFunction'] || 0) > 0
  ) {
    return 'inline_function';
  }

  if (
    (addedNodes['ClassDeclaration'] || 0) > 0 ||
    (addedNodes['MethodDeclaration'] || 0) > 0
  ) {
    return 'extract_class';
  }

  // Loop → Loop style change
  const forDelta = Math.abs((addedNodes['ForStatement'] || 0) - (removedNodes['ForStatement'] || 0));
  const whileDelta = Math.abs((addedNodes['WhileStatement'] || 0) - (removedNodes['WhileStatement'] || 0));

  if (forDelta > 0 || whileDelta > 0) {
    return 'loop_restructure';
  }

  // Conditional restructure
  const ifDelta = Math.abs((addedNodes['IfStatement'] || 0) - (removedNodes['IfStatement'] || 0));
  const switchDelta = Math.abs((addedNodes['SwitchStatement'] || 0) - (removedNodes['SwitchStatement'] || 0));

  if (ifDelta > 0 || switchDelta > 0) {
    return 'conditional_restructure';
  }

  return 'general_refactor';
}
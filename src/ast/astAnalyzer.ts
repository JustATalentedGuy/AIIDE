import * as ts from 'typescript';

export type ASTFingerprint = Record<string, number>;

/**
 * Generates a structural fingerprint of code.
 * Fingerprint = count of each AST node type.
 * Language-aware, rename-safe, formatting-safe.
 */
export function generateASTFingerprint(code: string): ASTFingerprint {
  try {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );

    const fingerprint: ASTFingerprint = {};

    function visit(node: ts.Node) {
      const kind = ts.SyntaxKind[node.kind];
      if (kind) {
        fingerprint[kind] = (fingerprint[kind] || 0) + 1;
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return fingerprint;
  } catch (error) {
    console.warn('AST analysis failed:', error);
    return {};
  }
}

/**
 * Sanitizes fingerprint by removing noise (minor node types).
 * Focuses on structural elements: functions, loops, conditionals, calls.
 */
export function sanitizeFingerprint(fp: ASTFingerprint): ASTFingerprint {
  const structuralTypes = new Set([
    'FunctionDeclaration',
    'ArrowFunction',
    'FunctionExpression',
    'ClassDeclaration',
    'MethodDeclaration',
    'ForStatement',
    'WhileStatement',
    'DoStatement',
    'IfStatement',
    'SwitchStatement',
    'TryStatement',
    'CatchClause',
    'Block',
    'CallExpression',
    'NewExpression',
    'ReturnStatement',
    'BreakStatement',
    'ContinueStatement',
    'ThrowStatement',
    'ExpressionStatement',
    'VariableDeclaration',
    'Parameter',
  ]);

  const sanitized: ASTFingerprint = {};
  for (const [key, count] of Object.entries(fp)) {
    if (structuralTypes.has(key)) {
      sanitized[key] = count;
    }
  }
  return sanitized;
}
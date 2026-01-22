// vscode-extension/src/eventCapture.ts
import * as vscode from 'vscode';
import { SignalDeriver } from './signalDeriver';

export class EventCapture {
  private signalDeriver: SignalDeriver;
  private disposables: vscode.Disposable[] = [];
  private activeEditor: vscode.TextEditor | undefined;
  private lastChangeTime: number = Date.now();
  private cursorIdleTimer: NodeJS.Timeout | undefined;
  private lastEditContent: string = '';
  private consecutiveReversals = 0;

  constructor(signalDeriver: SignalDeriver) {
    this.signalDeriver = signalDeriver;
    this.activeEditor = vscode.window.activeTextEditor;
    if (this.activeEditor) {
      this.lastEditContent = this.activeEditor.document.getText();
    }
  }

  startListening() {
    // Track active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.activeEditor = editor;
        if (editor) {
          this.lastEditContent = editor.document.getText();
        }
      })
    );

    // Track text document changes (insertions, deletions)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === this.activeEditor?.document) {
          event.contentChanges.forEach((change) => {
            const now = Date.now();
            const timeSinceLastEdit = now - this.lastChangeTime;

            // Detect undo/redo by checking for rapid reversals
            // (This is a heuristic since VS Code doesn't expose undo/redo events)
            this.detectUndoRedo(change.text, timeSinceLastEdit);

            // Record edit event with all required fields
            this.signalDeriver.recordEdit({
              type: change.text.length > 0 ? 'insertion' : 'deletion',
              length: Math.abs(change.text.length || (change.rangeLength || 0)),
              position: change.range.start.line,
              timeSinceLastEdit: timeSinceLastEdit,
              timestamp: now,
            });

            this.lastChangeTime = now;
          });
        }
      })
    );

    // Track saves - record AST snapshot
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        // Supported languages for AST analysis
        if (
          document.languageId === 'python' ||
          document.languageId === 'typescript' ||
          document.languageId === 'javascript'
        ) {
          // Record save event
          this.signalDeriver.recordSave();

          // Record AST snapshot for refactor detection
          const code = document.getText();
          this.signalDeriver.recordASTSnapshot(code, Date.now());
        } else {
          // For other languages, just record save without AST
          this.signalDeriver.recordSave();
        }
      })
    );

    // Track diagnostics (errors, warnings)
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics((event) => {
        event.uris.forEach((uri) => {
          const diagnostics = vscode.languages.getDiagnostics(uri);
          diagnostics.forEach((diag) => {
            this.signalDeriver.recordError({
              type: diag.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
              message: diag.message,
              line: diag.range.start.line,
              category: this.categorizeError(diag.message),
            });
          });
        });
      })
    );

    // Track cursor movement
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection((event) => {
        // Clear previous idle timer
        if (this.cursorIdleTimer) {
          clearTimeout(this.cursorIdleTimer);
        }

        // Set new idle timer
        this.cursorIdleTimer = setTimeout(() => {
          this.signalDeriver.recordIdleTime(5000); // Idle for 5+ seconds
        }, 5000);

        // Record cursor jumps (multiple selections = navigation)
        this.signalDeriver.recordCursorMovement(event.selections.length);
      })
    );
  }

  stopListening() {
    if (this.cursorIdleTimer) {
      clearTimeout(this.cursorIdleTimer);
    }
    this.disposables.forEach((d) => d.dispose());
  }

  /**
   * Detect undo/redo by looking for rapid reversals.
   * Heuristic: if an edit is quickly undone and redone, it's likely undo/redo activity.
   */
  private detectUndoRedo(changedText: string, timeSinceLastEdit: number): void {
    // Only consider "rapid" edits as potential undo/redo (< 500ms)
    if (timeSinceLastEdit > 500) {
      this.consecutiveReversals = 0;
      return;
    }

    // Simple heuristic: if text looks like it was just reversed (undo then insertion)
    // This is conservative and won't catch all undo/redo, but avoids false positives
    if (changedText.length === 0 && timeSinceLastEdit < 300) {
      // Quick deletion after insertion = possible undo
      this.consecutiveReversals++;
      if (this.consecutiveReversals > 2) {
        this.signalDeriver.recordUndoRedo();
        this.consecutiveReversals = 0;
      }
    } else if (changedText.length > 0 && this.lastEditContent.length === 0) {
      // Quick insertion after deletion = possible redo
      this.consecutiveReversals++;
      if (this.consecutiveReversals > 2) {
        this.signalDeriver.recordUndoRedo();
        this.consecutiveReversals = 0;
      }
    } else {
      this.consecutiveReversals = 0;
    }

    this.lastEditContent = changedText;
  }

  private categorizeError(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('undefined')) {
      return 'undefined_variable';
    }
    if (lowerMessage.includes('syntax')) {
      return 'syntax_error';
    }
    if (lowerMessage.includes('type')) {
      return 'type_error';
    }
    if (lowerMessage.includes('index') || lowerMessage.includes('bounds')) {
      return 'boundary_error';
    }
    if (lowerMessage.includes('off-by-one') || lowerMessage.includes('off by one')) {
      return 'off_by_one';
    }
    if (lowerMessage.includes('reference')) {
      return 'reference_error';
    }
    if (lowerMessage.includes('attribute') || lowerMessage.includes('has no attribute')) {
      return 'attribute_error';
    }

    return 'other';
  }
}
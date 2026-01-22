import * as vscode from 'vscode';

export interface PedagogicalFeedback {
  session_summary: string;
  observed_strengths: string[];
  observed_issues: Array<{
    issue: string;
    evidence: string;
    impact: string;
  }>;
  process_feedback: string[];
  learning_suggestions: string[];
  reflection_questions: string[];
}

export class FeedbackPanel {
  private static currentPanel: FeedbackPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.onDidDispose(() => {
      FeedbackPanel.currentPanel = undefined;
    }, this);

    // Set initial HTML
    this.panel.webview.html = this.getHtmlContent({
      session_summary: "Welcome to AI Learning Coach",
      observed_strengths: [],
      observed_issues: [],
      process_feedback: [],
      learning_suggestions: [],
      reflection_questions: [],
    });
  }


  /**
   * Create or show the feedback panel
   */
  public static show(
    feedback: PedagogicalFeedback,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ): void {
    if (FeedbackPanel.currentPanel) {
      // Reuse existing panel
      FeedbackPanel.currentPanel.update(feedback);
      FeedbackPanel.currentPanel.panel.reveal(vscode.ViewColumn.Two);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'aiLearningFeedback',
      '🎓 AI Learning Coach',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    FeedbackPanel.currentPanel = new FeedbackPanel(panel, extensionUri);
    FeedbackPanel.currentPanel.update(feedback);
  }

  /**
   * Update panel content with new feedback
   */
  private update(feedback: PedagogicalFeedback): void {
    this.panel.webview.html = this.getHtmlContent(feedback);
  }

  /**
   * Generate HTML content from feedback data
   */
  private getHtmlContent(feedback: PedagogicalFeedback): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Learning Coach</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1e1e1e;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      border-bottom: 2px solid #007acc;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .header h1 {
      color: #4fc3f7;
      font-size: 24px;
      margin-bottom: 5px;
    }

    .header p {
      color: #b0bec5;
      font-size: 14px;
    }

    .section {
      margin-bottom: 25px;
      padding: 15px;
      background: #252526;
      border-left: 4px solid #007acc;
      border-radius: 4px;
    }

    .section h2 {
      color: #4fc3f7;
      font-size: 18px;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .section ul, .section ol {
      margin-left: 20px;
    }

    .section li {
      margin-bottom: 8px;
      color: #d0d0d0;
    }

    .strength-item {
      padding: 8px 12px;
      background: #1a3a1a;
      border-left: 3px solid #4caf50;
      margin-bottom: 8px;
      border-radius: 3px;
    }

    .issue-item {
      padding: 10px 12px;
      background: #3a1a1a;
      border-left: 3px solid #ff7043;
      margin-bottom: 10px;
      border-radius: 3px;
    }

    .issue-item strong {
      color: #ff7043;
    }

    .evidence {
      color: #a0a0a0;
      font-size: 13px;
      margin-top: 5px;
      font-style: italic;
    }

    .impact {
      color: #a0a0a0;
      font-size: 13px;
      margin-top: 3px;
    }

    .question-item {
      padding: 10px 12px;
      background: #1a2a3a;
      border-left: 3px solid #ffc107;
      margin-bottom: 8px;
      border-radius: 3px;
      color: #e3f2fd;
    }

    .suggestion-item {
      padding: 10px 12px;
      background: #1e293b;
      border-left: 3px solid #9c27b0;
      margin-bottom: 8px;
      border-radius: 3px;
    }

    .process-item {
      padding: 8px 12px;
      background: #2c2c3c;
      margin-bottom: 8px;
      border-radius: 3px;
    }

    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #3a3a3a;
      font-size: 12px;
      color: #808080;
      text-align: center;
    }

    code {
      background: #1a1a1a;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      color: #ce9178;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 AI Learning Coach</h1>
      <p>Pedagogical feedback based on your coding behavior</p>
    </div>

    <div class="section">
      <h2>Session Overview</h2>
      <p>${this.escapeHtml(feedback.session_summary)}</p>
    </div>

    ${
      feedback.observed_strengths.length > 0
        ? `
    <div class="section">
      <h2>✅ Strengths Observed</h2>
      <div>
        ${feedback.observed_strengths.map((s) => `<div class="strength-item">${this.escapeHtml(s)}</div>`).join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      feedback.observed_issues.length > 0
        ? `
    <div class="section">
      <h2>🔍 Areas to Investigate</h2>
      <div>
        ${feedback.observed_issues
          .map(
            (issue) => `
          <div class="issue-item">
            <strong>${this.escapeHtml(issue.issue)}</strong>
            <div class="evidence">Evidence: ${this.escapeHtml(issue.evidence)}</div>
            <div class="impact">Why it matters: ${this.escapeHtml(issue.impact)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      feedback.process_feedback.length > 0
        ? `
    <div class="section">
      <h2>💭 Process Observations</h2>
      <div>
        ${feedback.process_feedback.map((f) => `<div class="process-item">• ${this.escapeHtml(f)}</div>`).join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      feedback.learning_suggestions.length > 0
        ? `
    <div class="section">
      <h2>📚 Learning Suggestions</h2>
      <ol>
        ${feedback.learning_suggestions.map((s) => `<li>${this.escapeHtml(s)}</li>`).join('')}
      </ol>
    </div>
    `
        : ''
    }

    ${
      feedback.reflection_questions.length > 0
        ? `
    <div class="section">
      <h2>❓ Reflection Questions</h2>
      <p style="margin-bottom: 12px; color: #b0bec5;">Take time to think about these:</p>
      <div>
        ${feedback.reflection_questions.map((q) => `<div class="question-item">• ${this.escapeHtml(q)}</div>`).join('')}
      </div>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>This feedback is based on your coding behavior and patterns, not on correctness alone.</p>
      <p style="margin-top: 8px;">Focus on understanding the "why" behind each observation.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
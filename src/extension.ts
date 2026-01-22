import * as vscode from 'vscode';
import { EventCapture } from './eventCapture';
import { SignalDeriver } from './signalDeriver';
import { FeedbackPanel } from './ui/feedbackPanel';
import { BackendClient } from './backend';
import { AgentManager } from './agentManager';
import { ProblemContextManager } from './problemContext';

let context: vscode.ExtensionContext;
let agentManager: AgentManager;
let problemContextManager: ProblemContextManager;
let signalDeriver: SignalDeriver;
let eventCapture: EventCapture;
let feedbackPanel: FeedbackPanel;

export async function activate(ctx: vscode.ExtensionContext) {
  console.log('🚀 === AI Coach extension ACTIVATING ===');
  context = ctx;

  try {
    // Initialize problem context manager
    problemContextManager = new ProblemContextManager();

    // Initialize agent manager
    agentManager = new AgentManager(ctx);
    await agentManager.initialize();

    // Initialize signal deriver
    signalDeriver = new SignalDeriver();

    // Initialize event capture
    eventCapture = new EventCapture(signalDeriver);
    eventCapture.startListening();

    // Register commands
    registerCommands();

    console.log('✅ AI Coach extension activated');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to activate AI Coach: ${msg}`);
  }
}

function registerCommands() {
  // In registerCommands() function:
context.subscriptions.push(
  vscode.commands.registerCommand('aiLearningIDE.pasteProblem', async () => {
    console.log('🧪 === pasteProblem command called ===');
    await pasteProblemCommand();
  })
);

context.subscriptions.push(
  vscode.commands.registerCommand('aiLearningIDE.requestFeedback', async () => {
    console.log('🧪 === requestFeedback command called ===');
    await requestFeedbackCommand();
  })
);

context.subscriptions.push(
  vscode.commands.registerCommand('aiLearningIDE.resetSession', async () => {
    console.log('🧪 === resetSession command called ===');
    await resetSessionCommand();
  })
);

context.subscriptions.push(
  vscode.commands.registerCommand('aiLearningIDE.showProblem', async () => {
    console.log('🧪 === showProblem command called ===');
    await showProblemCommand();
  })
);
}

async function pasteProblemCommand(): Promise<void> {
  try {
    // Get clipboard
    const clipboard = await vscode.env.clipboard.readText();

    if (!clipboard) {
      vscode.window.showWarningMessage('Clipboard is empty');
      return;
    }

    // Parse problem
    const parsed = problemContextManager.parseProblemText(clipboard);

    vscode.window.showInformationMessage(
      `✅ Problem loaded: ${parsed.title || 'Untitled'} (${parsed.difficulty || 'unknown'})`
    );

    // Show parsed content for verification
    const message =
      `Title: ${parsed.title || 'N/A'}\n` +
      `Difficulty: ${parsed.difficulty || 'N/A'}\n` +
      `Tags: ${parsed.tags.join(', ') || 'N/A'}\n` +
      `Constraints: ${parsed.constraints ? parsed.constraints.substring(0, 100) + '...' : 'N/A'}`;

    vscode.window.showInformationMessage(message);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to parse problem: ${msg}`);
  }
}

async function requestFeedbackCommand(): Promise<void> {
  try {
    // Get current editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    // Collect session data
    const signals = signalDeriver.getSessionSignals();
    const code = editor.document.getText();
    const problemContext = problemContextManager.getCurrentContext();

    // Show loading indicator
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Getting AI feedback...',
        cancellable: false,
      },
      async (progress) => {
        // Send to agent
        const response = await agentManager.sendRequest({
          type: 'feedback',
          payload: {
            problem_context: problemContext,
            session_signals: signals,
            learner_profile: {},
            code_snapshot: code,
            user_id: 'user_' + Date.now(),
          },
        });

        if (response.success) {
          const feedback = response.data?.feedback;
          FeedbackPanel.show(feedback, context.extensionUri, context);
          vscode.window.showInformationMessage('✅ Feedback ready!');
        } else {
          vscode.window.showErrorMessage(
            `Feedback failed: ${response.error}`
          );
        }
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to request feedback: ${msg}`);
  }
}

async function resetSessionCommand(): Promise<void> {
  signalDeriver.resetSession();
  problemContextManager.reset();
  vscode.window.showInformationMessage('✅ Session reset');
}

async function showProblemCommand(): Promise<void> {
  const context = problemContextManager.getCurrentContext();

  if (!context) {
    vscode.window.showWarningMessage('No problem context. Paste one first.');
    return;
  }

  const display =
    `# ${context.title || 'Untitled Problem'}\n\n` +
    `**Difficulty:** ${context.difficulty || 'Unknown'}\n` +
    `**Tags:** ${context.tags.join(', ') || 'None'}\n` +
    `**Source:** ${context.source || 'Unknown'}\n\n` +
    `## Constraints\n${context.constraints || 'Not provided'}\n\n` +
    `## Examples\n${context.examples.map((ex) => `\`\`\`\n${ex}\n\`\`\``).join('\n\n') || 'Not provided'}`;

  // Show in a text document
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: display,
  });

  await vscode.window.showTextDocument(doc);
}

export async function deactivate() {
  eventCapture.stopListening();
  await agentManager.dispose();
}
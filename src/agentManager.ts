import * as path from 'path';
import { spawn } from 'child_process';
import { BackendClient } from './backend';
import * as vscode from 'vscode';

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class AgentManager {
  private agentProcess: any;
  private backendClient: BackendClient | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async initialize(): Promise<void> {
    try {
      await this.startPythonAgent();
      console.log('✅ AgentManager initialized with Python agent');
    } catch (error) {
      console.error('❌ Agent initialization failed:', error);
      throw error;
    }
  }

  private async startPythonAgent(): Promise<void> {
    const agentPath = path.join(this.context.extensionPath, 'python-agent', 'agent.py');
    const venvPython = path.join(this.context.extensionPath, '.extension-agent', 'Scripts', 'python.exe');

    console.log('🔧 Starting Python agent:', venvPython, agentPath);

    this.agentProcess = spawn(venvPython, [agentPath], {
      cwd: path.join(this.context.extensionPath, 'python-agent'),
      env: {
        ...process.env,
        PYTHONPATH: path.join(this.context.extensionPath, 'python-agent'),
        DOTENV_PATH: path.join(this.context.extensionPath, '.env'),
      },
    });

    this.agentProcess.on('error', (error: Error) => {
      console.error('❌ Agent spawn error:', error.message);
      vscode.window.showErrorMessage(`Agent failed to start: ${error.message}`);
    });

    this.agentProcess.on('close', (code: number) => {
      console.log(`Agent process exited with code ${code}`);
      this.backendClient = null;
    });

    // Initialize BackendClient
    this.backendClient = new BackendClient(this.agentProcess);

    // Health check
    const health = await this.backendClient.health();
    if (health.success && health.data?.llm_ready) {
      console.log('✅ LLM-ready agent confirmed:', health.data);
    } else {
      console.warn('⚠️ Agent health check:', health);
    }
  }

  async sendRequest(request: any): Promise<AgentResponse> {
    if (!this.backendClient) {
      return {
        success: false,
        error: 'Agent not initialized. Check Python agent setup.',
      };
    }

    try {
      // Your existing payload format is PERFECT for the new agent!
      const response = await this.backendClient.requestFeedback(
        request.payload.user_id,
        request.payload.problem_context,
        request.payload.session_signals,
        request.payload.code_snapshot
      );
      return response;
    } catch (error) {
      console.error('Agent request failed:', error);
      return {
        success: false,
        error: `Request failed: ${error}`,
      };
    }
  }

  async dispose(): Promise<void> {
    if (this.agentProcess) {
      this.agentProcess.kill();
    }
  }
}
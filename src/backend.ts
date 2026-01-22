import axios from 'axios';

export interface BackendResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Communicates with Python agent via stdio
 * The agent reads JSON from stdin, outputs JSON to stdout
 */
export class BackendClient {
  private agentProcess: any;
  private requestQueue: Array<{
    data: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private buffer = '';

  constructor(agentProcess: any) {
    this.agentProcess = agentProcess;

    // Listen for agent output
    this.agentProcess.stdout.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this._processOutput();
    });

    this.agentProcess.stderr.on('data', (data: Buffer) => {
      console.error('[Agent stderr]', data.toString());
    });
  }

  /**
   * Request feedback from Python agent
   * 
   * Full payload structure:
   * {
   *   type: 'feedback',
   *   payload: {
   *     user_id: string
   *     problem_context: { file_name, language, line_count }
   *     session_signals: { 12 signal metrics }
   *     code_snapshot: string
   *     learner_profile: optional
   *   }
   * }
   */
  async requestFeedback(
    userId: string,
    problemContext: {
      file_name: string;
      language: string;
      line_count: number;
    },
    sessionSignals: Record<string, any>,
    codeSnapshot: string
  ): Promise<BackendResponse> {
    const request = {
      type: 'feedback',
      payload: {
        user_id: userId,
        problem_context: problemContext,
        session_signals: sessionSignals,
        code_snapshot: codeSnapshot,
      },
    };

    return this._sendRequest(request);
  }

  /**
   * Health check
   */
  async health(): Promise<BackendResponse> {
    const request = { type: 'health' };
    return this._sendRequest(request);
  }

  /**
   * Internal: send request and wait for response
   */
  private _sendRequest(request: any): Promise<BackendResponse> {
    return new Promise((resolve, reject) => {
      try {
        const jsonLine = JSON.stringify(request) + '\n';
        this.agentProcess.stdin.write(jsonLine);
        this.requestQueue.push({
          data: jsonLine,
          resolve,
          reject,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Internal: process stdout line by line
   */
  private _processOutput() {
    const lines = this.buffer.split('\n');
    this.buffer = lines[lines.length - 1]; // Keep incomplete line

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const response = JSON.parse(line);
        const pending = this.requestQueue.shift();
        if (pending) {
          pending.resolve(response);
        }
      } catch (error) {
        console.error('Failed to parse agent response:', line, error);
      }
    }
  }
}
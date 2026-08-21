import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Worklog');
  }
  return channel;
}

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  getOutputChannel().appendLine(`[${timestamp}] ${message}`);
}

export function logError(message: string, error: unknown): void {
  const detail = error instanceof Error ? error.stack || error.message : String(error);
  log(`ERROR: ${message}`);
  log(detail);
  getOutputChannel().show(true);
}

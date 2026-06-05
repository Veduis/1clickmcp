import * as vscode from 'vscode';
import { McpServer } from '../types/server';

export async function copyInstallCommand(server?: McpServer): Promise<void> {
  if (!server) {
    vscode.window.showErrorMessage('No server selected');
    return;
  }

  const command = `${server.command} ${server.args?.join(' ') || ''}`;

  await vscode.env.clipboard.writeText(command);
  vscode.window.showInformationMessage(`📋 Copied install command for "${server.name}"`);
}

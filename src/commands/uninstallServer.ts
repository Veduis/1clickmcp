import * as vscode from 'vscode';
import { DetectedClient } from '../types/server';
import { removeServer, serverExists } from '../config/writer';

export async function uninstallServer(
  context: vscode.ExtensionContext,
  serverId: string,
  client: DetectedClient
): Promise<void> {
  if (!serverExists(client.configPath, client.configFormat, serverId)) {
    vscode.window.showWarningMessage(`Server "${serverId}" is not installed in ${client.displayName}`);
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Remove "${serverId}" from ${client.displayName}?`,
    'Remove',
    'Cancel'
  );

  if (confirm !== 'Remove') {
    return;
  }

  try {
    removeServer(client.configPath, client.configFormat, serverId);
    vscode.window.showInformationMessage(`🗑️ Removed "${serverId}" from ${client.displayName}`);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to uninstall server: ${err}`);
  }
}

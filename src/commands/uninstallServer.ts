import * as vscode from 'vscode';
import { DetectedClient } from '../types/server';
import { removeServer, serverExists } from '../config/writer';
import { detectClients } from '../config/detector';
import { readConfig } from '../config/reader';

export async function uninstallServer(
  context: vscode.ExtensionContext,
  serverId: string,
  client?: DetectedClient
): Promise<boolean> {
  // If no client provided, detect installed clients and let user pick
  if (!client) {
    const clients = detectClients().filter(c => c.exists);
    const installedClients = clients.filter(c => {
      const config = readConfig(c.configPath, c.configFormat);
      return !!config.mcpServers[serverId];
    });

    if (installedClients.length === 0) {
      vscode.window.showWarningMessage(`Server "${serverId}" is not installed in any detected client.`);
      return false;
    }

    if (installedClients.length === 1) {
      client = installedClients[0];
    } else {
      const selection = await vscode.window.showQuickPick(
        installedClients.map(c => ({
          label: c.displayName,
          description: c.configPath,
          client: c
        })),
        { placeHolder: 'Select which client to uninstall from' }
      );
      if (!selection) {
        return false;
      }
      client = selection.client;
    }
  }

  if (!serverExists(client.configPath, client.configFormat, serverId)) {
    vscode.window.showWarningMessage(`Server "${serverId}" is not installed in ${client.displayName}`);
    return false;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Remove "${serverId}" from ${client.displayName}?`,
    { modal: true, detail: 'This will remove the server from your MCP configuration file.' },
    'Remove'
  );

  if (confirm !== 'Remove') {
    return false;
  }

  try {
    removeServer(client.configPath, client.configFormat, serverId);

    // Verify it was actually removed
    const stillExists = serverExists(client.configPath, client.configFormat, serverId);
    if (stillExists) {
      vscode.window.showErrorMessage(`Failed to remove "${serverId}" — file may be locked or read-only.`);
      return false;
    }

    vscode.window.showInformationMessage(
      `🗑️ Removed "${serverId}" from ${client.displayName}`,
      'View Config'
    ).then(action => {
      if (action === 'View Config') {
        vscode.workspace.openTextDocument(client!.configPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });

    return true;
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to uninstall server: ${err}`);
    return false;
  }
}

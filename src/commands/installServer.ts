import * as vscode from 'vscode';
import { McpServer, DetectedClient } from '../types/server';
import { detectClients } from '../config/detector';
import { addServer, serverExists } from '../config/writer';
import { promptForEnvVars } from '../utils/envPrompt';
import { validateServerConfig, sanitizeServerId } from '../utils/validator';

export async function installServer(
  context: vscode.ExtensionContext,
  server?: McpServer
): Promise<void> {
  if (!server) {
    vscode.window.showErrorMessage('No server selected for installation');
    return;
  }

  const clients = detectClients();
  const activeClients = clients.filter(c => c.exists);

  if (activeClients.length === 0) {
    const action = await vscode.window.showWarningMessage(
      'No MCP clients detected. Install one first: Claude Desktop, Cursor, Cline, Devin (formerly Windsurf), VS Code, Continue.dev, Zed, or mcphub.nvim',
      'Open VePrompts',
      'Cancel'
    );
    if (action === 'Open VePrompts') {
      vscode.env.openExternal(vscode.Uri.parse('https://veprompts.com/mcp/servers/'));
    }
    return;
  }

  let targetClient: DetectedClient;

  if (activeClients.length === 1) {
    targetClient = activeClients[0];
  } else {
    const preferred = vscode.workspace.getConfiguration('veprompts-mcp').get<string>('preferredClient');
    const preferredClient = activeClients.find(c => c.id === preferred);

    if (preferredClient) {
      targetClient = preferredClient;
    } else {
      const selection = await vscode.window.showQuickPick(
        activeClients.map(c => ({
          label: c.displayName,
          description: c.configPath,
          client: c
        })),
        { placeHolder: 'Select MCP client to install server to' }
      );

      if (!selection) {
        return;
      }

      targetClient = selection.client;
    }
  }

  const serverId = sanitizeServerId(server.id);

  if (serverExists(targetClient.configPath, targetClient.configFormat, serverId)) {
    const overwrite = await vscode.window.showWarningMessage(
      `Server "${server.name}" is already installed in ${targetClient.displayName}. Overwrite?`,
      'Yes',
      'No'
    );
    if (overwrite !== 'Yes') {
      return;
    }
  }

  const config = {
    command: server.command,
    args: server.args,
    env: server.env
  };

  const errors = validateServerConfig(config);
  if (errors.length > 0) {
    vscode.window.showErrorMessage(`Invalid server config: ${errors.join(', ')}`);
    return;
  }

  // Prompt for environment variables if needed
  let finalConfig = { ...config };
  if (server.env && Object.keys(server.env).length > 0) {
    const envValues = await promptForEnvVars(server.env);
    if (envValues === undefined) {
      return; // User cancelled
    }
    finalConfig.env = envValues;
  }

  try {
    addServer(targetClient.configPath, targetClient.configFormat, serverId, finalConfig);
    vscode.window.showInformationMessage(
      `✅ Installed "${server.name}" to ${targetClient.displayName}`,
      'View Config',
      'Open on VePrompts'
    ).then(action => {
      if (action === 'View Config') {
        vscode.workspace.openTextDocument(targetClient.configPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      } else if (action === 'Open on VePrompts') {
        vscode.env.openExternal(vscode.Uri.parse(`https://veprompts.com/mcp/servers/${server.id}/`));
      }
    });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to install server: ${err}`);
  }
}

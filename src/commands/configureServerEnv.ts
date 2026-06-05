import * as vscode from 'vscode';
import { McpServer, DetectedClient } from '../types/server';
import { detectClients } from '../config/detector';
import { readConfig } from '../config/reader';
import { addServer } from '../config/writer';
import { promptForEnvVars } from '../utils/envPrompt';

export async function configureServerEnv(
  context: vscode.ExtensionContext,
  server?: McpServer,
  client?: DetectedClient
): Promise<void> {
  if (!server) {
    vscode.window.showErrorMessage('No server selected for configuration');
    return;
  }

  // If no client provided, detect and let user pick
  if (!client) {
    const clients = detectClients().filter(c => c.exists);
    const installedClients = clients.filter(c => {
      const config = readConfig(c.configPath, c.configFormat);
      return !!config.mcpServers[server.id];
    });

    if (installedClients.length === 0) {
      vscode.window.showWarningMessage(`"${server.name}" is not installed in any detected client.`);
      return;
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
        { placeHolder: 'Select which client to configure' }
      );
      if (!selection) {
        return;
      }
      client = selection.client;
    }
  }

  if (!server.envVars || server.envVars.length === 0) {
    vscode.window.showInformationMessage(`"${server.name}" has no environment variables to configure.`);
    return;
  }

  // Prompt for each env var
  const envValues = await promptForEnvVars(
    server.envVars.reduce((acc, ev) => {
      acc[ev.name] = ev.description;
      return acc;
    }, {} as Record<string, string>)
  );

  if (envValues === undefined) {
    return; // User cancelled
  }

  // Read current config and update env
  const currentConfig = readConfig(client.configPath, client.configFormat);
  const serverConfig = currentConfig.mcpServers[server.id];

  if (!serverConfig) {
    vscode.window.showErrorMessage(`Server "${server.name}" not found in ${client.displayName} config.`);
    return;
  }

  const updatedConfig = {
    ...serverConfig,
    env: envValues
  };

  try {
    addServer(client.configPath, client.configFormat, server.id, updatedConfig);
    vscode.window.showInformationMessage(
      `✅ Environment variables configured for "${server.name}" in ${client.displayName}`,
      'View Config'
    ).then(action => {
      if (action === 'View Config') {
        vscode.workspace.openTextDocument(client!.configPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to configure environment variables: ${err}`);
  }
}

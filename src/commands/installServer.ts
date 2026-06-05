import * as vscode from 'vscode';
import { McpServer, DetectedClient } from '../types/server';
import { detectClients, getAllPossiblePaths } from '../config/detector';
import { addServer, serverExists, removeServer } from '../config/writer';
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
      'No MCP clients detected. Install one first: Claude Desktop, Cursor, Cline, Devin (formerly Windsurf), VS Code:, Continue.dev, Zed, or mcphub.nvim',
      'Open VePrompts',
      'Cancel'
    );
    if (action === 'Open VePrompts') {
      vscode.env.openExternal(vscode.Uri.parse('https://veprompts.com/mcp/servers/'));
    }
    return;
  }

  // ── CLIENT SELECTION ──────────────────────────────────────────────
  // Always show QuickPick so user explicitly chooses where to install
  const preferred = vscode.workspace.getConfiguration('veprompts-mcp').get<string>('preferredClient');
  const preferredClient = activeClients.find(c => c.id === preferred);

  const clientItems = activeClients.map(c => ({
    label: c.displayName,
    description: c.configPath,
    client: c
  }));

  // Add "Custom path..." option for edge cases
  clientItems.push({
    label: '$(file-directory) Custom path...',
    description: 'Install to a custom MCP config file',
    client: null as any // Will be handled separately
  });

  let targetClient: DetectedClient | null = null;

  if (activeClients.length === 1 && preferredClient) {
    // If only 1 client AND it's the preferred one, still ask but pre-select it
    targetClient = preferredClient;
  } else {
    const selection = await vscode.window.showQuickPick(
      clientItems,
      {
        placeHolder: 'Select MCP client to install server to',
        ...(preferredClient && { activeItems: [clientItems.find(i => i.client === preferredClient)!] })
      }
    );

    if (!selection) {
      return; // User cancelled
    }

    if (selection.label.includes('Custom path')) {
      // Handle custom path installation
      const customPath = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: 'Select MCP Config File',
        filters: { 'JSON': ['json'] }
      });

      if (!customPath || customPath.length === 0) {
        return;
      }

      const configPath = customPath[0].fsPath;
      const configFormat = await vscode.window.showQuickPick(
        [
          { label: 'Claude Desktop / Cline / Roo Code', value: 'claude' },
          { label: 'Cursor / Devin (Windsurf)', value: 'cursor' },
          { label: 'VS Code: (native MCP)', value: 'vscode' },
          { label: 'Continue.dev', value: 'continue' },
          { label: 'Zed', value: 'zed' },
          { label: 'mcphub.nvim', value: 'mcphub' }
        ],
        { placeHolder: 'Select config format for this file' }
      );

      if (!configFormat) {
        return;
      }

      targetClient = {
        id: 'custom',
        name: 'custom',
        displayName: 'Custom',
        configPath,
        exists: true,
        platform: 'universal',
        configFormat: configFormat.value as any
      };
    } else {
      targetClient = selection.client;
    }
  }

  if (!targetClient) {
    return;
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

  // ── ENV VAR HANDLING ──────────────────────────────────────────────
  // Install immediately with placeholder values — don't block on env prompts
  let finalConfig = { ...config };
  const needsEnvConfig = server.envVars && server.envVars.length > 0;

  if (needsEnvConfig) {
    // Build placeholder env from envVars definitions
    const placeholderEnv: Record<string, string> = {};
    for (const ev of server.envVars) {
      placeholderEnv[ev.name] = ev.example || '';
    }
    finalConfig.env = placeholderEnv;
  }

  try {
    addServer(targetClient.configPath, targetClient.configFormat, serverId, finalConfig);

    const buttons: string[] = ['View Config', 'Open on VePrompts'];
    if (needsEnvConfig) {
      buttons.unshift('Configure Env Vars');
    }

    vscode.window.showInformationMessage(
      `✅ Installed "${server.name}" to ${targetClient.displayName}${needsEnvConfig ? ' (env vars need configuration)' : ''}`,
      ...buttons
    ).then(action => {
      if (action === 'View Config') {
        vscode.workspace.openTextDocument(targetClient!.configPath).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      } else if (action === 'Open on VePrompts') {
        vscode.env.openExternal(vscode.Uri.parse(`https://veprompts.com/mcp/servers/${server.id}/`));
      } else if (action === 'Configure Env Vars') {
        vscode.commands.executeCommand('veprompts-mcp.configureServerEnv', server, targetClient);
      }
    });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to install server: ${err}`);
  }
}

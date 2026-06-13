import * as vscode from 'vscode';
import { ServerTreeProvider, ServerTreeItem } from './providers/ServerTreeProvider';
import { ServerDetailPanel } from './providers/ServerDetailPanel';
import { installServer } from './commands/installServer';
import { uninstallServer } from './commands/uninstallServer';
import { searchServers } from './commands/searchServers';
import { copyInstallCommand } from './commands/copyInstallCommand';
import { openOnVePrompts, openVeduis } from './commands/openOnVePrompts';
import { configureServerEnv } from './commands/configureServerEnv';
import { filterServers } from './commands/filterServers';

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new ServerTreeProvider(context);

  // Register tree view
  const treeView = vscode.window.createTreeView('veprompts-mcp.servers', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });

  context.subscriptions.push(treeView);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.openPanel', () => {
      vscode.commands.executeCommand('veprompts-mcp.servers.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.refresh', () => {
      treeProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.installServer', async (item: ServerTreeItem) => {
      if (item.server) {
        await installServer(context, item.server);
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.uninstallServer', async (item: ServerTreeItem) => {
      if (item.server) {
        const success = await uninstallServer(context, item.server.id, item.client);
        if (success) {
          treeProvider.refresh();
          // Also refresh detail panel if open
          if (ServerDetailPanel.currentPanel) {
            ServerDetailPanel.currentPanel.refresh();
          }
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.searchServers', async () => {
      const server = await searchServers(context);
      if (server) {
        await installServer(context, server);
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.copyInstallCommand', async (item: ServerTreeItem) => {
      if (item.server) {
        await copyInstallCommand(item.server);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.openOnVePrompts', (item: ServerTreeItem) => {
      openOnVePrompts(item.server?.id);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.openServerDetail', (server: import('./types/server').McpServer) => {
      ServerDetailPanel.createOrShow(context.extensionUri, server);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.openVeduis', () => {
      openVeduis();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.configureServerEnv', async (item: ServerTreeItem) => {
      if (item.server && item.client) {
        await configureServerEnv(context, item.server, item.client);
        treeProvider.refresh();
      }
    })
  );

  // ── SIDEBAR SEARCH ────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.searchInSidebar', async () => {
      const query = await vscode.window.showInputBox({
        placeHolder: 'Search servers by name, category, tag, or author...',
        prompt: 'Type to filter the MCP server catalog',
        ignoreFocusOut: true
      });

      if (query === undefined) {
        return; // User cancelled
      }

      if (query.trim() === '') {
        treeProvider.clearSearch();
        return;
      }

      const results = await filterServers(context, query);
      treeProvider.setSearch(query, results);

      if (results.length === 0) {
        vscode.window.showInformationMessage(`No servers found for "${query}"`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('veprompts-mcp.clearSidebarSearch', () => {
      treeProvider.clearSearch();
    })
  );

  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get<boolean>('veprompts-mcp.welcomeShown');
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      '🚀 VePrompts MCP Installer is ready. Browse 500+ MCP servers and install with one click.',
      'Browse Servers',
      'Dismiss'
    ).then(action => {
      if (action === 'Browse Servers') {
        vscode.commands.executeCommand('veprompts-mcp.servers.focus');
      }
    });
    context.globalState.update('veprompts-mcp.welcomeShown', true);
  }
}

export function deactivate(): void {
  // Cleanup if needed
}

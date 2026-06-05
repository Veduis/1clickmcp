import * as vscode from 'vscode';
import * as path from 'path';
import { McpServer, DetectedClient } from '../types/server';
import { detectClients } from '../config/detector';
import { readConfig } from '../config/reader';
import { fetchServers } from '../commands/searchServers';

export class ServerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly server?: McpServer,
    public readonly client?: DetectedClient,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);

    if (server) {
      this.tooltip = `${server.name}\n${server.description}\nCommand: ${server.command} ${server.args?.join(' ') || ''}`;
      this.description = server.categories.slice(0, 2).join(', ');

      // Make server items clickable — open on VePrompts
      this.command = {
        command: 'veprompts-mcp.openOnVePrompts',
        title: 'Open Server Details',
        arguments: [this]
      };

      if (client) {
        const config = readConfig(client.configPath, client.configFormat);
        const isInstalled = !!config.mcpServers[server.id];
        this.iconPath = new vscode.ThemeIcon(isInstalled ? 'check' : 'circle-outline');
        this.contextValue = isInstalled ? 'installed' : 'server';
      } else {
        this.iconPath = new vscode.ThemeIcon('circle-outline');
        this.contextValue = 'server';
      }
    }
  }
}

export class ServerTreeProvider implements vscode.TreeDataProvider<ServerTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ServerTreeItem | undefined | null | void> = new vscode.EventEmitter<ServerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ServerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ServerTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ServerTreeItem): Promise<ServerTreeItem[]> {
    if (!element) {
      // Root level: show categories
      const servers = await fetchServers(this.context);
      const categories = [...new Set(servers.flatMap(s => s.categories))].sort();

      return categories.map(cat => new ServerTreeItem(
        cat,
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        undefined,
        'category'
      ));
    }

    if (element.contextValue === 'category') {
      // Show servers in this category
      const servers = await fetchServers(this.context);
      const clients = detectClients();
      const primaryClient = clients.find(c => c.exists);

      const categoryServers = servers.filter(s =>
        s.categories.includes(element.label)
      );

      return categoryServers.map(s => new ServerTreeItem(
        s.name,
        vscode.TreeItemCollapsibleState.None,
        s,
        primaryClient,
        'server'
      ));
    }

    return [];
  }
}

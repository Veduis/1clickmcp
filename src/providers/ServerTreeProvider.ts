import * as vscode from 'vscode';
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
      const stars = server.stars || 0;
      this.tooltip = `${server.title || server.name}\n${server.description}\n⭐ ${stars.toLocaleString()} stars | ${server.language || 'TypeScript'} | ${server.license || 'MIT'}`;
      this.description = `⭐ ${stars.toLocaleString()}`;

      // Make server items clickable — open detail panel inside VS Code:
      this.command = {
        command: 'veprompts-mcp.openServerDetail',
        title: 'Open Server Details',
        arguments: [this.server]
      };

      this.iconPath = server.official
        ? new vscode.ThemeIcon('verified', new vscode.ThemeColor('charts.green'))
        : new vscode.ThemeIcon('package');

      if (client) {
        const config = readConfig(client.configPath, client.configFormat);
        const serverConfig = config.mcpServers[server.id];
        const isInstalled = !!serverConfig;
        const hasEmptyEnv = isInstalled && server.envVars && server.envVars.length > 0 &&
          (!serverConfig.env || Object.values(serverConfig.env).some(v => !v || v === ''));

        this.contextValue = isInstalled ? (hasEmptyEnv ? 'installed-needs-config' : 'installed') : 'server';

        if (isInstalled) {
          if (hasEmptyEnv) {
            // Show warning icon for installed servers missing env vars
            this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));
            this.tooltip += '\n⚠️ Environment variables need configuration';
            this.description = `⭐ ${stars.toLocaleString()} ⚠️ needs config`;
          } else {
            this.iconPath = new vscode.ThemeIcon('check');
          }
        }
      } else {
        this.contextValue = 'server';
      }
    }
  }
}

export class CategoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly category: string,
    public readonly servers: McpServer[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(category, collapsibleState);
    this.description = `${servers.length} server${servers.length !== 1 ? 's' : ''}`;
    this.contextValue = 'category';
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}

export class ServerTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      // Root level: show categories
      const servers = await fetchServers(this.context);
      const categories = new Map<string, McpServer[]>();

      for (const server of servers) {
        const cat = server.category || 'Uncategorized';
        if (!categories.has(cat)) {
          categories.set(cat, []);
        }
        categories.get(cat)!.push(server);
      }

      const items: vscode.TreeItem[] = [];
      for (const [category, catServers] of categories) {
        items.push(new CategoryTreeItem(
          category,
          catServers,
          vscode.TreeItemCollapsibleState.Collapsed
        ));
      }

      return items;
    }

    if (element instanceof CategoryTreeItem) {
      // Show servers in this category
      const clients = detectClients();
      const primaryClient = clients.find(c => c.exists);

      return element.servers.map(s => new ServerTreeItem(
        s.title || s.name,
        vscode.TreeItemCollapsibleState.None,
        s,
        primaryClient,
        'server'
      ));
    }

    return [];
  }
}

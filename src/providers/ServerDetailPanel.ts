import * as vscode from 'vscode';
import { McpServer } from '../types/server';
import { detectClients } from '../config/detector';
import { readConfig } from '../config/reader';

export class ServerDetailPanel {
  public static currentPanel: ServerDetailPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _server: McpServer;

  private constructor(
    panel: vscode.WebviewPanel,
    server: McpServer
  ) {
    this._panel = panel;
    this._server = server;
    this._panel.webview.html = this._getHtml();

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'install':
            await vscode.commands.executeCommand('veprompts-mcp.installServer', {
              server: this._server
            } as any);
            this._updateHtml();
            break;
          case 'uninstall':
            const clients = detectClients();
            const client = clients.find(c => c.exists);
            if (client) {
              await vscode.commands.executeCommand('veprompts-mcp.uninstallServer', {
                server: this._server,
                client
              } as any);
              this._updateHtml();
            }
            break;
          case 'copyConfig':
            await vscode.commands.executeCommand('veprompts-mcp.copyInstallCommand', {
              server: this._server
            } as any);
            break;
          case 'openExternal':
            vscode.env.openExternal(vscode.Uri.parse(message.url));
            break;
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(_extensionUri: vscode.Uri, server: McpServer): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (ServerDetailPanel.currentPanel) {
      ServerDetailPanel.currentPanel._panel.reveal(column);
      ServerDetailPanel.currentPanel._server = server;
      ServerDetailPanel.currentPanel._panel.title = server.name;
      ServerDetailPanel.currentPanel._updateHtml();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'veprompts-mcp.serverDetail',
      server.name,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ServerDetailPanel.currentPanel = new ServerDetailPanel(panel, server);
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private _updateHtml(): void {
    this._panel.webview.html = this._getHtml();
  }

  private _getHtml(): string {
    const s = this._server;
    const e = this._escapeHtml.bind(this);

    const clients = detectClients();
    const primaryClient = clients.find(c => c.exists);
    let isInstalled = false;
    if (primaryClient) {
      const config = readConfig(primaryClient.configPath, primaryClient.configFormat);
      isInstalled = !!config.mcpServers[s.id];
    }

    const installCommand = `${s.command}${s.args ? ' ' + s.args.join(' ') : ''}`;
    const hasEnv = s.env && Object.keys(s.env).length > 0;
    const envVars = hasEnv
      ? Object.entries(s.env!).map(([name, value]) =>
          `<tr><td><code>${e(name)}</code></td><td>${e(String(value))}</td></tr>`
        ).join('')
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 24px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 22px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .meta {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-right: 6px;
      font-weight: 600;
    }
    .category-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .installed-badge {
      background: #166534;
      color: #86efac;
    }
    .not-installed-badge {
      background: #374151;
      color: #d1d5db;
    }
    .one-click {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #166534;
      color: #86efac;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }
    p { margin: 12px 0; }
    .actions {
      margin: 20px 0;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-primary {
      padding: 10px 20px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary:hover { background: #5558e0; }
    .btn-secondary {
      padding: 10px 20px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .btn-danger {
      padding: 10px 20px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-danger:hover { background: #b91c1c; }
    .section {
      margin: 24px 0;
      padding: 16px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 8px;
    }
    .section h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
      font-family: var(--vscode-editor-font-family);
    }
    .method {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      padding: 12px;
      border-radius: 6px;
      margin: 8px 0;
    }
    .method code {
      display: block;
      margin-bottom: 4px;
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
      word-break: break-all;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 13px;
    }
    th { font-weight: 600; }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-panel-border);
      text-align: center;
    }
    .footer a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    .footer a:hover { text-decoration: underline; }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h1>
    ${e(s.name)}
    ${isInstalled
      ? '<span class="badge installed-badge">✓ Installed</span>'
      : '<span class="badge not-installed-badge">Not Installed</span>'
    }
  </h1>
  <div class="meta">
    ${s.categories.map(c => `<span class="badge category-badge">${e(c)}</span>`).join('')}
    ${!hasEnv ? '<span class="one-click">⚡ 1-Click Install</span>' : ''}
  </div>

  <p>${e(s.description)}</p>

  <div class="actions">
    ${isInstalled
      ? `<button class="btn-danger" id="installBtn">🗑 Uninstall</button>`
      : `<button class="btn-primary" id="installBtn">⚡ Install into MCP Client</button>`
    }
    <button class="btn-secondary" id="copyBtn">📋 Copy Config</button>
    <button class="btn-secondary" id="externalBtn">🌐 Open on VePrompts</button>
  </div>

  <div class="section">
    <h2>Install Command</h2>
    <div class="method">
      <code>${e(installCommand)}</code>
      <span style="color: var(--vscode-descriptionForeground); font-size: 12px;">Click Copy Config to copy this command</span>
    </div>
  </div>

  ${hasEnv ? `
  <div class="section">
    <h2>Environment Variables</h2>
    <table>
      <tr><th>Name</th><th>Description</th></tr>
      ${envVars}
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>Compatibility</h2>
    <p>Works with: Claude Desktop, Cursor, Cline, VS Code, Devin (formerly Windsurf)</p>
  </div>

  <div class="footer">
    <p>📖 <a href="#" id="docLink">View full documentation on VePrompts</a></p>
    <p>Powered by <a href="#" id="vpLink">VePrompts</a> — Built by <a href="#" id="veduisLink">Veduis</a></p>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    document.getElementById('installBtn').addEventListener('click', () => {
      vscode.postMessage({ command: ${isInstalled ? '"uninstall"' : '"install"'} });
    });

    document.getElementById('copyBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'copyConfig' });
    });

    document.getElementById('externalBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openExternal', url: 'https://veprompts.com/mcp/servers/${e(s.id)}/' });
    });

    document.getElementById('docLink').addEventListener('click', () => {
      vscode.postMessage({ command: 'openExternal', url: 'https://veprompts.com/mcp/servers/${e(s.id)}/' });
    });

    document.getElementById('vpLink').addEventListener('click', () => {
      vscode.postMessage({ command: 'openExternal', url: 'https://veprompts.com' });
    });

    document.getElementById('veduisLink').addEventListener('click', () => {
      vscode.postMessage({ command: 'openExternal', url: 'https://veduis.com' });
    });
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    ServerDetailPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }
}

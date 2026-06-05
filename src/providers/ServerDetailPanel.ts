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
      ServerDetailPanel.currentPanel._panel.title = server.title || server.name;
      ServerDetailPanel.currentPanel._updateHtml();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'veprompts-mcp.serverDetail',
      server.title || server.name,
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

    const tools = s.tools.map(t => `<li><strong>${e(t.name)}</strong> — ${e(t.description)}</li>`).join('');
    const envVars = s.envVars.map(v =>
      `<tr><td><code>${e(v.name)}</code></td><td>${e(v.description)}</td><td>${v.required ? '✅' : 'Optional'}</td></tr>`
    ).join('');
    const installMethods = s.installMethods.map(m =>
      `<div class="method"><code>${e(m.command)}</code><span>${e(m.description)}</span></div>`
    ).join('');

    // Ensure vepromptsUrl is valid
    const docsUrl = s.vepromptsUrl || `https://veprompts.com/mcp/servers/${s.id}/`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    h1 { margin-bottom: 8px; font-size: 22px; }
    .meta { color: var(--vscode-descriptionForeground); margin-bottom: 20px; font-size: 13px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; font-weight: 600; }
    .official { background: #2d5016; color: #7ee787; }
    .featured { background: #1a3a5c; color: #79c0ff; }
    .installed { background: #166534; color: #86efac; }
    .section { margin: 24px 0; }
    .section h2 { font-size: 16px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; margin-bottom: 12px; }
    code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: var(--vscode-editor-font-family); }
    .method { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 12px; border-radius: 6px; margin: 8px 0; }
    .method code { display: block; margin-bottom: 4px; font-family: var(--vscode-editor-font-family); word-break: break-all; }
    .method span { color: var(--vscode-descriptionForeground); font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    th { font-weight: 600; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--vscode-panel-border); text-align: center; }
    .footer a { color: var(--vscode-textLink-foreground); text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .actions { margin: 20px 0; display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-primary { padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary:hover { background: #5558e0; }
    .btn-secondary { padding: 10px 20px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .btn-secondary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-danger { padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .btn-danger:hover { background: #b91c1c; }
    .one-click { display: inline-flex; align-items: center; gap: 6px; background: #166534; color: #86efac; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; }
    .docs-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-panel-border); border-radius: 6px; color: var(--vscode-textLink-foreground); text-decoration: none; font-size: 13px; font-weight: 500; }
    .docs-link:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <h1>${e(s.title || s.name)}</h1>
  <div class="meta">
    ${s.official ? '<span class="badge official">Official</span>' : ''}
    ${s.featured ? '<span class="badge featured">Featured</span>' : ''}
    ${isInstalled ? '<span class="badge installed">✓ Installed</span>' : ''}
    ⭐ ${(s.stars || 0).toLocaleString()} | ${e(s.language || 'TypeScript')} | ${e(s.license || 'MIT')} | By <a href="#" onclick="openExternal('${e(s.authorUrl || s.repoUrl || s.githubUrl)}')">${e(s.author || 'Unknown')}</a>
    ${s.envVars.length === 0 ? '<span class="one-click">⚡ 1-Click Install</span>' : ''}
  </div>

  <p>${e(s.description)}</p>

  <div class="actions">
    ${isInstalled
      ? '<button class="btn-danger" id="installBtn">🗑 Uninstall</button>'
      : '<button class="btn-primary" id="installBtn">⚡ Install into MCP Client</button>'
    }
    <button class="btn-secondary" id="copyBtn">📋 Copy Config</button>
  </div>

  <a href="#" class="docs-link" onclick="openExternal('${e(docsUrl)}')">📖 View Full Documentation on VePrompts</a>

  <div class="section">
    <h2>Install Methods</h2>
    ${installMethods || `<div class="method"><code>${e(s.command)} ${e(s.args.join(' '))}</code><span>Default install command</span></div>`}
  </div>

  ${s.envVars.length > 0 ? `
  <div class="section">
    <h2>Environment Variables</h2>
    <table>
      <tr><th>Name</th><th>Description</th><th>Required</th></tr>
      ${envVars}
    </table>
  </div>
  ` : ''}

  ${s.tools.length > 0 ? `
  <div class="section">
    <h2>Tools (${s.tools.length})</h2>
    <ul>${tools}</ul>
  </div>
  ` : ''}

  <div class="section">
    <h2>Compatibility</h2>
    <p>Clients: ${e(s.compatibility.clients.join(', ') || 'All major clients')}</p>
    <p>Transport: ${e(s.compatibility.transport.join(', ') || 'stdio')}</p>
  </div>

  <div class="footer">
    <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">
      Powered by <a href="#" onclick="openExternal('https://veprompts.com')">VePrompts</a> — The #1 free MCP server directory
    </p>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('installBtn').addEventListener('click', () => {
      vscode.postMessage({ command: ${isInstalled ? '"uninstall"' : '"install"'} });
    });
    document.getElementById('copyBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'copyConfig' });
    });
    function openExternal(url) {
      vscode.postMessage({ command: 'openExternal', url });
    }
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

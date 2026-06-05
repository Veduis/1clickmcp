import * as vscode from 'vscode';
import { McpServer, DetectedClient } from '../types/server';
import { detectClients } from '../config/detector';
import { readConfig } from '../config/reader';
import { serverExists } from '../config/writer';

export class ServerDetailPanel {
  public static currentPanel: ServerDetailPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _server: McpServer;
  private _extensionUri: vscode.Uri;

  private constructor(
    panel: vscode.WebviewPanel,
    server: McpServer,
    extensionUri: vscode.Uri
  ) {
    this._panel = panel;
    this._server = server;
    this._extensionUri = extensionUri;
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
          case 'uninstall': {
            const success = await vscode.commands.executeCommand('veprompts-mcp.uninstallServer', {
              server: this._server
            } as any);
            // The command returns undefined through executeCommand, but the side effect
            // is what matters — refresh the panel to show updated state
            setTimeout(() => this._updateHtml(), 300);
            break;
          }
          case 'configureEnv':
            await vscode.commands.executeCommand('veprompts-mcp.configureServerEnv', {
              server: this._server
            } as any);
            this._updateHtml();
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

  public static createOrShow(extensionUri: vscode.Uri, server: McpServer): void {
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

    ServerDetailPanel.currentPanel = new ServerDetailPanel(panel, server, extensionUri);
  }

  public refresh(): void {
    this._updateHtml();
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

  private _getInstallStatus(): { isInstalled: boolean; client?: DetectedClient; hasEmptyEnv: boolean } {
    const clients = detectClients().filter(c => c.exists);
    for (const client of clients) {
      const config = readConfig(client.configPath, client.configFormat);
      const serverConfig = config.mcpServers[this._server.id];
      if (serverConfig) {
        const hasEmptyEnv = this._server.envVars && this._server.envVars.length > 0 &&
          (!serverConfig.env || Object.values(serverConfig.env).some(v => !v || v === ''));
        return { isInstalled: true, client, hasEmptyEnv };
      }
    }
    return { isInstalled: false, hasEmptyEnv: false };
  }

  private _getHtml(): string {
    const s = this._server;
    const e = this._escapeHtml.bind(this);
    const status = this._getInstallStatus();

    const tools = s.tools.map(t => `<li><strong>${e(t.name)}</strong> — ${e(t.description)}</li>`).join('');
    const envVars = s.envVars.map(v =>
      `<tr><td><code>${e(v.name)}</code></td><td>${e(v.description)}</td><td>${v.required ? 'Required' : 'Optional'}</td></tr>`
    ).join('');
    const installMethods = s.installMethods.map(m =>
      `<div class="method"><code>${e(m.command)}</code><span>${e(m.description)}</span></div>`
    ).join('');

    const docsUrl = s.vepromptsUrl || `https://veprompts.com/mcp/servers/${s.id}/`;

    // Determine button state
    let primaryButton: string;
    let secondaryButton: string | null = null;

    if (status.isInstalled) {
      if (status.hasEmptyEnv) {
        primaryButton = `<button class="btn btn-configure" id="configureBtn">Configure Environment Variables</button>`;
        secondaryButton = `<button class="btn btn-danger" id="installBtn">Uninstall</button>`;
      } else {
        primaryButton = `<button class="btn btn-danger" id="installBtn">Uninstall</button>`;
      }
    } else {
      primaryButton = `<button class="btn btn-primary" id="installBtn">Install</button>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-foreground);
      --fg-secondary: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --link: var(--vscode-textLink-foreground);
      --code-bg: var(--vscode-textCodeBlock-background);
      --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      --font-mono: var(--vscode-editor-font-family, 'SF Mono', Monaco, 'Cascadia Code', monospace);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.6;
      color: var(--fg);
      background: var(--bg);
      padding: 24px 28px;
      max-width: 720px;
    }

    /* Header */
    .header { margin-bottom: 20px; }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.3px;
      margin-bottom: 8px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--fg-secondary);
    }
    .meta a { color: var(--link); text-decoration: none; }
    .meta a:hover { text-decoration: underline; }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .badge-official { background: rgba(46, 160, 67, 0.15); color: #3fb950; }
    .badge-featured { background: rgba(56, 139, 253, 0.15); color: #58a6ff; }
    .badge-installed { background: rgba(46, 160, 67, 0.15); color: #3fb950; }
    .badge-needs-config { background: rgba(210, 153, 34, 0.15); color: #d29922; }

    /* Description */
    .description {
      font-size: 13px;
      line-height: 1.7;
      color: var(--fg);
      margin-bottom: 20px;
    }

    /* Actions */
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid transparent;
      font-family: var(--font);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn:active { opacity: 0.7; }
    .btn-primary { background: #0969da; color: #fff; }
    .btn-danger { background: #cf222e; color: #fff; }
    .btn-configure { background: #9a6700; color: #fff; }
    .btn-secondary {
      background: var(--code-bg);
      color: var(--fg);
      border-color: var(--border);
    }

    /* Docs link */
    .docs-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--link);
      text-decoration: none;
      margin-bottom: 24px;
    }
    .docs-link:hover { text-decoration: underline; }

    /* Sections */
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--fg-secondary);
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    /* Install methods */
    .method {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .method code {
      display: block;
      font-family: var(--font-mono);
      font-size: 12px;
      word-break: break-all;
      margin-bottom: 4px;
      color: var(--fg);
    }
    .method span {
      font-size: 11px;
      color: var(--fg-secondary);
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
    }
    th {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--fg-secondary);
    }
    td code {
      font-family: var(--font-mono);
      font-size: 11px;
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 3px;
    }

    /* Lists */
    ul { list-style: none; }
    ul li {
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
    }
    ul li:last-child { border-bottom: none; }
    ul li strong { font-weight: 600; }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 11px;
      color: var(--fg-secondary);
    }
    .footer a { color: var(--link); text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${e(s.title || s.name)}</h1>
    <div class="meta">
      ${s.official ? '<span class="badge badge-official">Official</span>' : ''}
      ${s.featured ? '<span class="badge badge-featured">Featured</span>' : ''}
      ${status.isInstalled ? (status.hasEmptyEnv ? '<span class="badge badge-needs-config">Installed — needs config</span>' : '<span class="badge badge-installed">Installed</span>') : ''}
      <span>⭐ ${(s.stars || 0).toLocaleString()}</span>
      <span>·</span>
      <span>${e(s.language || 'TypeScript')}</span>
      <span>·</span>
      <span>${e(s.license || 'MIT')}</span>
      <span>·</span>
      <span>By <a href="#" onclick="openExternal('${e(s.authorUrl || s.repoUrl || s.githubUrl)}')">${e(s.author || 'Unknown')}</a></span>
    </div>
  </div>

  <p class="description">${e(s.description)}</p>

  <div class="actions">
    ${primaryButton}
    ${secondaryButton || ''}
    <button class="btn btn-secondary" id="copyBtn">Copy Config</button>
  </div>

  <a href="#" class="docs-link" onclick="openExternal('${e(docsUrl)}')">View full documentation on VePrompts →</a>

  <div class="section">
    <div class="section-title">Install Methods</div>
    ${installMethods || `<div class="method"><code>${e(s.command)} ${e(s.args.join(' '))}</code><span>Default install command</span></div>`}
  </div>

  ${s.envVars.length > 0 ? `
  <div class="section">
    <div class="section-title">Environment Variables</div>
    <table>
      <tr><th>Name</th><th>Description</th><th>Required</th></tr>
      ${envVars}
    </table>
  </div>
  ` : ''}

  ${s.tools.length > 0 ? `
  <div class="section">
    <div class="section-title">Tools (${s.tools.length})</div>
    <ul>${tools}</ul>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Compatibility</div>
    <p style="font-size:12px;margin-bottom:4px;"><strong>Clients:</strong> ${e(s.compatibility.clients.join(', ') || 'All major clients')}</p>
    <p style="font-size:12px;"><strong>Transport:</strong> ${e(s.compatibility.transport.join(', ') || 'stdio')}</p>
  </div>

  <div class="footer">
    <p>Powered by <a href="#" onclick="openExternal('https://veprompts.com')">VePrompts</a> — The #1 free MCP server directory</p>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const installBtn = document.getElementById('installBtn');
    const configureBtn = document.getElementById('configureBtn');
    const copyBtn = document.getElementById('copyBtn');

    if (installBtn) {
      installBtn.addEventListener('click', () => {
        vscode.postMessage({ command: ${status.isInstalled ? '"uninstall"' : '"install"'} });
      });
    }
    if (configureBtn) {
      configureBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'configureEnv' });
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'copyConfig' });
      });
    }
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

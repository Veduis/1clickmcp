import * as vscode from 'vscode';

export function openOnVePrompts(serverId?: string): void {
  const url = serverId
    ? `https://veprompts.com/mcp/servers/${serverId}/`
    : 'https://veprompts.com/mcp/servers/';

  vscode.env.openExternal(vscode.Uri.parse(url));
}

export function openVeduis(): void {
  vscode.env.openExternal(vscode.Uri.parse('https://veduis.com'));
}

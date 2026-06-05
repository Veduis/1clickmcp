import * as vscode from 'vscode';
import { McpServer } from '../types/server';
import { fetchServers } from './searchServers';

export async function filterServers(
  context: vscode.ExtensionContext,
  query: string
): Promise<McpServer[]> {
  const servers = await fetchServers(context);
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return servers;
  }

  return servers.filter(s => {
    const searchable = [
      s.name,
      s.title,
      s.description,
      s.category,
      s.subcategory,
      ...(s.tags || []),
      s.author,
      s.language,
      s.license
    ].filter(Boolean).join(' ').toLowerCase();

    return searchable.includes(lowerQuery);
  });
}

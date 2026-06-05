import * as vscode from 'vscode';
import { McpServer } from '../types/server';

let cachedServers: McpServer[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchServers(context: vscode.ExtensionContext): Promise<McpServer[]> {
  const now = Date.now();

  if (cachedServers && (now - lastFetch) < CACHE_TTL) {
    return cachedServers;
  }

  const catalogUrl = vscode.workspace.getConfiguration('veprompts-mcp').get<string>(
    'catalogUrl',
    'https://veprompts.com/api/mcp-catalog'
  );

  try {
    const response = await (globalThis as any).fetch(catalogUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json() as Record<string, unknown> | unknown[];
    const servers = Array.isArray(data) ? data : (data.servers as McpServer[]) || [];
    cachedServers = servers as McpServer[];
    lastFetch = now;
    return cachedServers;
  } catch (err) {
    vscode.window.showWarningMessage(
      `Failed to fetch server catalog: ${err}. Using fallback data.`,
      'Retry'
    ).then(action => {
      if (action === 'Retry') {
        cachedServers = null;
        fetchServers(context);
      }
    });

    // Return minimal fallback data
    return getFallbackServers();
  }
}

export async function searchServers(context: vscode.ExtensionContext): Promise<McpServer | undefined> {
  const servers = await fetchServers(context);

  const items = servers.map(s => ({
    label: s.name,
    description: s.description.slice(0, 60),
    detail: `${s.categories.join(', ')} | ${s.command}`,
    server: s
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Search MCP servers by name or category...',
    matchOnDescription: true,
    matchOnDetail: true
  });

  return selected?.server;
}

function getFallbackServers(): McpServer[] {
  return [
    {
      id: 'filesystem',
      name: 'Filesystem',
      description: 'Secure file operations with configurable access controls',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/dir'],
      categories: ['filesystem', 'utility'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Repository management, file operations, and GitHub API integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'Your GitHub personal access token' },
      categories: ['version-control', 'api'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github'
    },
    {
      id: 'fetch',
      name: 'Fetch',
      description: 'Web content fetching and conversion for efficient LLM usage',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      categories: ['web', 'utility'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch'
    }
  ];
}

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
    'https://veprompts.com/api/mcp-catalog.json'
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

    // Return fallback data with expanded server list
    return getFallbackServers();
  }
}

export async function searchServers(context: vscode.ExtensionContext): Promise<McpServer | undefined> {
  const servers = await fetchServers(context);

  const items = servers.map(s => ({
    label: s.title || s.name,
    description: s.description.slice(0, 60),
    detail: `${s.category} | ⭐ ${s.stars.toLocaleString()}`,
    server: s
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Search MCP servers by name or category...',
    matchOnDescription: true,
    matchOnDetail: true
  });

  return selected?.server;
}

function createFallbackServer(partial: Partial<McpServer> & { id: string; name: string; description: string; command: string; args: string[]; categories: string[]; githubUrl: string }): McpServer {
  return {
    id: partial.id,
    name: partial.name,
    title: partial.title || partial.name,
    description: partial.description,
    author: partial.author || 'Unknown',
    authorUrl: partial.authorUrl || '',
    repoUrl: partial.githubUrl || '',
    npmPackage: partial.npmPackage || null,
    pypiPackage: partial.pypiPackage || null,
    official: partial.official || false,
    featured: partial.featured || false,
    category: partial.categories[0] || 'uncategorized',
    subcategory: partial.subcategory || '',
    tags: partial.tags || [],
    language: partial.language || 'Unknown',
    license: partial.license || 'Unknown',
    stars: partial.stars || 0,
    lastCommit: partial.lastCommit || '',
    installMethods: partial.installMethods || [{ type: 'npx', command: `${partial.command} ${partial.args.join(' ')}`, description: 'Install via npx' }],
    envVars: partial.envVars || [],
    compatibility: partial.compatibility || { clients: [], transport: ['stdio'], requiresAuth: false, requiresApiKey: false },
    tools: partial.tools || [],
    rating: partial.rating || { reliability: 0, documentation: 0, easeOfInstall: 0 },
    vepromptsUrl: `https://veprompts.com/mcp/servers/${partial.id}/`,
    command: partial.command,
    args: partial.args,
    categories: partial.categories,
    githubUrl: partial.githubUrl,
    env: partial.env || {}
  };
}

function getFallbackServers(): McpServer[] {
  return [
    createFallbackServer({
      id: 'filesystem',
      name: 'Filesystem',
      description: 'Secure file operations with configurable access controls',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/dir'],
      categories: ['developer-tools'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
      stars: 1250,
      official: true
    }),
    createFallbackServer({
      id: 'github',
      name: 'GitHub',
      description: 'Repository management, file operations, and GitHub API integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'Your GitHub personal access token' },
      categories: ['developer-tools'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
      stars: 3400,
      official: true
    }),
    createFallbackServer({
      id: 'fetch',
      name: 'Fetch',
      description: 'Web content fetching and conversion for efficient LLM usage',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      categories: ['web'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
      stars: 890,
      official: true
    })
  ];
}

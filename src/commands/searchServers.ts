import * as vscode from 'vscode';
import { McpServer } from '../types/server';

let cachedServers: McpServer[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize API response to full McpServer interface.
 * Handles both old sparse format (from live API) and new rich format.
 */
function normalizeServer(raw: Record<string, unknown>): McpServer {
  const id = String(raw.id || raw.name || 'unknown');
  const name = String(raw.name || raw.id || 'Unknown');
  const title = String(raw.title || raw.name || raw.id || 'Unknown');
  const description = String(raw.description || '');
  const command = String(raw.command || 'npx');
  const args = Array.isArray(raw.args) ? raw.args.map(String) : [];
  const categories = Array.isArray(raw.categories) ? raw.categories.map(String)
    : Array.isArray(raw.category) ? raw.category.map(String)
    : raw.category ? [String(raw.category)]
    : ['uncategorized'];
  const githubUrl = String(raw.githubUrl || raw.repoUrl || '');
  const env: Record<string, string> = raw.env && typeof raw.env === 'object'
    ? raw.env as Record<string, string>
    : {};

  // Handle envVars from new format or derive from env
  const envVars = Array.isArray(raw.envVars) ? (raw.envVars as any[]).map(v => ({
    name: String(v.name || v.key || ''),
    description: String(v.description || v.desc || ''),
    required: Boolean(v.required),
    example: String(v.example || v.default || '')
  })) : Object.entries(env).map(([name, value]) => ({
    name,
    description: `Environment variable for ${name}`,
    required: true,
    example: String(value)
  }));

  // Handle tools from new format
  const tools = Array.isArray(raw.tools) ? (raw.tools as any[]).map(t => ({
    name: String(t.name || ''),
    description: String(t.description || t.desc || '')
  })) : [];

  // Handle installMethods
  const installMethods = Array.isArray(raw.installMethods) ? (raw.installMethods as any[]).map(m => ({
    type: String(m.type || 'npx'),
    command: String(m.command || `${command} ${args.join(' ')}`),
    description: String(m.description || 'Install via package manager')
  })) : [{
    type: command === 'uvx' ? 'uvx' : command === 'npx' ? 'npx' : 'custom',
    command: `${command} ${args.join(' ')}`,
    description: `Install via ${command}`
  }];

  // Handle compatibility
  const compat = raw.compatibility && typeof raw.compatibility === 'object'
    ? raw.compatibility as any
    : {};

  // Handle rating
  const rating = raw.rating && typeof raw.rating === 'object'
    ? raw.rating as any
    : {};

  return {
    id,
    name,
    title,
    description,
    author: String(raw.author || 'Unknown'),
    authorUrl: String(raw.authorUrl || ''),
    repoUrl: githubUrl,
    npmPackage: raw.npmPackage ? String(raw.npmPackage) : null,
    pypiPackage: raw.pypiPackage ? String(raw.pypiPackage) : null,
    official: Boolean(raw.official),
    featured: Boolean(raw.featured),
    category: categories[0] || 'uncategorized',
    subcategory: String(raw.subcategory || ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    language: String(raw.language || 'TypeScript'),
    license: String(raw.license || 'MIT'),
    stars: typeof raw.stars === 'number' ? raw.stars : 0,
    lastCommit: String(raw.lastCommit || ''),
    installMethods,
    envVars,
    compatibility: {
      clients: Array.isArray(compat.clients) ? compat.clients.map(String) : ['Claude Desktop', 'Cursor', 'VS Code'],
      transport: Array.isArray(compat.transport) ? compat.transport.map(String) : ['stdio'],
      requiresAuth: Boolean(compat.requiresAuth),
      requiresApiKey: Boolean(compat.requiresApiKey)
    },
    tools,
    rating: {
      reliability: typeof rating.reliability === 'number' ? rating.reliability : 0,
      documentation: typeof rating.documentation === 'number' ? rating.documentation : 0,
      easeOfInstall: typeof rating.easeOfInstall === 'number' ? rating.easeOfInstall : 0
    },
    vepromptsUrl: String(raw.vepromptsUrl || `https://veprompts.com/mcp/servers/${id}/`),
    command,
    args,
    categories,
    githubUrl,
    env
  };
}

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
    const rawServers = Array.isArray(data) ? data : (data.servers as unknown[]) || [];
    cachedServers = rawServers.map(s => normalizeServer(s as Record<string, unknown>));
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

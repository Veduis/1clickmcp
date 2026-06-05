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
      categories: ['developer-tools', 'file-operations'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem'
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Repository management, file operations, and GitHub API integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'Your GitHub personal access token' },
      categories: ['developer-tools', 'version-control'],
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
    },
    {
      id: 'brave-search',
      name: 'Brave Search',
      description: 'Web search using Brave Search API',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: { BRAVE_API_KEY: 'Your Brave Search API key' },
      categories: ['web', 'search'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search'
    },
    {
      id: 'google-maps',
      name: 'Google Maps',
      description: 'Location services, directions, and place details via Google Maps',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-google-maps'],
      env: { GOOGLE_MAPS_API_KEY: 'Your Google Maps API key' },
      categories: ['web', 'location'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps'
    },
    {
      id: 'puppeteer',
      name: 'Puppeteer',
      description: 'Browser automation and web scraping with Puppeteer',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      categories: ['web', 'automation'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer'
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      description: 'SQLite database operations with MCP integration',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/database.db'],
      categories: ['database', 'developer-tools'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite'
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'PostgreSQL database access and management',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
      categories: ['database', 'developer-tools'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres'
    },
    {
      id: 'docker',
      name: 'Docker',
      description: 'Docker container management and operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-docker'],
      categories: ['devops', 'containers'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/docker'
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      description: 'Kubernetes cluster management and pod operations',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-kubernetes'],
      categories: ['devops', 'containers'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/kubernetes'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slack workspace integration and messaging',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: { SLACK_BOT_TOKEN: 'xoxb-your-token', SLACK_TEAM_ID: 'Your Slack team ID' },
      categories: ['communication', 'productivity'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack'
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'GitLab repository and project management',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gitlab'],
      env: { GITLAB_PERSONAL_ACCESS_TOKEN: 'Your GitLab token', GITLAB_API_URL: 'https://gitlab.com/api/v4' },
      categories: ['developer-tools', 'version-control'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab'
    },
    {
      id: 'sentry',
      name: 'Sentry',
      description: 'Error tracking and performance monitoring via Sentry',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sentry'],
      env: { SENTRY_AUTH_TOKEN: 'Your Sentry auth token' },
      categories: ['monitoring', 'developer-tools'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sentry'
    },
    {
      id: 'aws-kb-retrieval',
      name: 'AWS Knowledge Base',
      description: 'AWS Knowledge Base retrieval for Bedrock agents',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-aws-kb-retrieval'],
      env: { AWS_ACCESS_KEY_ID: 'Your AWS access key', AWS_SECRET_ACCESS_KEY: 'Your AWS secret key', AWS_REGION: 'us-east-1' },
      categories: ['cloud', 'ai-ml'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/aws-kb-retrieval'
    },
    {
      id: 'everart',
      name: 'EverArt',
      description: 'AI image generation through EverArt API',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everart'],
      env: { EVERART_API_KEY: 'Your EverArt API key' },
      categories: ['ai-ml', 'media'],
      githubUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everart'
    }
  ];
}

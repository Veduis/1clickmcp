export interface McpServer {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  categories: string[];
  githubUrl?: string;
  installCount?: number;
  rating?: number;
}

export interface DetectedClient {
  id: string;
  name: string;
  displayName: string;
  configPath: string;
  exists: boolean;
  platform: 'macos' | 'linux' | 'windows' | 'universal';
  configFormat: 'claude' | 'cursor' | 'vscode' | 'continue' | 'zed' | 'mcphub';
}

export interface ClientConfig {
  mcpServers: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

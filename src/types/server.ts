export interface McpServer {
  id: string;
  name: string;
  title: string;
  description: string;
  author: string;
  authorUrl: string;
  repoUrl: string;
  npmPackage: string | null;
  pypiPackage: string | null;
  official: boolean;
  featured: boolean;
  category: string;
  subcategory: string;
  tags: string[];
  language: string;
  license: string;
  stars: number;
  lastCommit: string;
  installMethods: InstallMethod[];
  envVars: EnvVar[];
  compatibility: Compatibility;
  tools: Tool[];
  rating: Rating;
  vepromptsUrl: string;
  command: string;
  args: string[];
  categories: string[];
  githubUrl: string;
  env: Record<string, string>;
}

export interface InstallMethod {
  type: string;
  command: string;
  description: string;
}

export interface EnvVar {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

export interface Compatibility {
  clients: string[];
  transport: string[];
  requiresAuth: boolean;
  requiresApiKey: boolean;
}

export interface Tool {
  name: string;
  description: string;
}

export interface Rating {
  reliability: number;
  documentation: number;
  easeOfInstall: number;
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

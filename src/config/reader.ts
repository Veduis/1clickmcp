import * as fs from 'fs';
import { ClientConfig } from '../types/server';

export function readConfig(configPath: string, format: string): ClientConfig {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    switch (format) {
      case 'claude':
      case 'cursor':
        return {
          mcpServers: parsed.mcpServers || {}
        };
      case 'vscode':
        return {
          mcpServers: parsed.mcpServers || {}
        };
      case 'continue': {
        const servers: ClientConfig['mcpServers'] = {};
        if (parsed.mcpServers) {
          for (const [key, value] of Object.entries(parsed.mcpServers)) {
            if (typeof value === 'object' && value !== null) {
              const v = value as Record<string, unknown>;
              servers[key] = {
                command: String(v.command || ''),
                args: Array.isArray(v.args) ? v.args.map(String) : undefined,
                env: v.env as Record<string, string> | undefined
              };
            }
          }
        }
        return { mcpServers: servers };
      }
      case 'zed': {
        const servers: ClientConfig['mcpServers'] = {};
        if (parsed.mcp_servers) {
          for (const [key, value] of Object.entries(parsed.mcp_servers)) {
            if (typeof value === 'object' && value !== null) {
              const v = value as Record<string, unknown>;
              servers[key] = {
                command: String(v.command || ''),
                args: Array.isArray(v.args) ? v.args.map(String) : undefined
              };
            }
          }
        }
        return { mcpServers: servers };
      }
      case 'mcphub':
        return {
          mcpServers: parsed.mcpServers || {}
        };
      default:
        return { mcpServers: {} };
    }
  } catch (err) {
    return { mcpServers: {} };
  }
}

export function configExists(configPath: string): boolean {
  return fs.existsSync(configPath);
}

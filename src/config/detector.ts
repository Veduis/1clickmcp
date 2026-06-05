import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DetectedClient } from '../types/server';

function getHomeDir(): string {
  return os.homedir();
}

function getPlatform(): 'macos' | 'linux' | 'windows' {
  const platform = os.platform();
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  if (platform === 'win32') return 'windows';
  return 'linux';
}

export function detectClients(): DetectedClient[] {
  const home = getHomeDir();
  const platform = getPlatform();
  const clients: DetectedClient[] = [];

  // Claude Desktop
  const claudePaths: Record<string, string[]> = {
    macos: [path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')],
    linux: [path.join(home, '.config', 'Claude', 'claude_desktop_config.json')],
    windows: [path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json')]
  };
  for (const p of claudePaths[platform] || []) {
    if (fs.existsSync(p)) {
      clients.push({
        id: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: p,
        exists: true,
        platform,
        configFormat: 'claude'
      });
      break;
    }
  }

  // Cursor
  const cursorPath = path.join(home, '.cursor', 'mcp.json');
  if (fs.existsSync(cursorPath)) {
    clients.push({
      id: 'cursor',
      name: 'cursor',
      displayName: 'Cursor',
      configPath: cursorPath,
      exists: true,
      platform: 'universal',
      configFormat: 'cursor'
    });
  }

  // Cline
  const clinePaths: Record<string, string[]> = {
    macos: [path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')],
    linux: [path.join(home, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')],
    windows: [path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')]
  };
  for (const p of clinePaths[platform] || []) {
    if (fs.existsSync(p)) {
      clients.push({
        id: 'cline',
        name: 'cline',
        displayName: 'Cline',
        configPath: p,
        exists: true,
        platform,
        configFormat: 'claude'
      });
      break;
    }
  }

  // Windsurf
  const windsurfPath = path.join(home, '.codeium', 'windsurf', 'mcp_config.json');
  if (fs.existsSync(windsurfPath)) {
    clients.push({
      id: 'windsurf',
      name: 'windsurf',
      displayName: 'Windsurf',
      configPath: windsurfPath,
      exists: true,
      platform: 'universal',
      configFormat: 'cursor'
    });
  }

  // VS Code (native MCP)
  const vscodePaths: Record<string, string[]> = {
    macos: [path.join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json')],
    linux: [path.join(home, '.config', 'Code', 'User', 'mcp.json')],
    windows: [path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'mcp.json')]
  };
  for (const p of vscodePaths[platform] || []) {
    if (fs.existsSync(p)) {
      clients.push({
        id: 'vscode',
        name: 'vscode',
        displayName: 'VS Code',
        configPath: p,
        exists: true,
        platform,
        configFormat: 'vscode'
      });
      break;
    }
  }

  // Continue.dev
  const continuePath = path.join(home, '.continue', 'config.json');
  if (fs.existsSync(continuePath)) {
    clients.push({
      id: 'continue',
      name: 'continue',
      displayName: 'Continue.dev',
      configPath: continuePath,
      exists: true,
      platform: 'universal',
      configFormat: 'continue'
    });
  }

  // Zed
  const zedPaths: Record<string, string[]> = {
    macos: [path.join(home, '.config', 'zed', 'settings.json')],
    linux: [path.join(home, '.config', 'zed', 'settings.json')]
  };
  for (const p of zedPaths[platform] || []) {
    if (fs.existsSync(p)) {
      clients.push({
        id: 'zed',
        name: 'zed',
        displayName: 'Zed',
        configPath: p,
        exists: true,
        platform,
        configFormat: 'zed'
      });
      break;
    }
  }

  // mcphub.nvim
  const mcphubPath = path.join(home, '.config', 'mcphub', 'servers.json');
  if (fs.existsSync(mcphubPath)) {
    clients.push({
      id: 'mcphub-nvim',
      name: 'mcphub-nvim',
      displayName: 'mcphub.nvim',
      configPath: mcphubPath,
      exists: true,
      platform: 'universal',
      configFormat: 'mcphub'
    });
  }

  return clients;
}

export function getAllPossiblePaths(): string[] {
  const home = getHomeDir();
  const platform = getPlatform();
  const paths: string[] = [];

  // Claude Desktop
  if (platform === 'macos') {
    paths.push(path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'));
  } else if (platform === 'linux') {
    paths.push(path.join(home, '.config', 'Claude', 'claude_desktop_config.json'));
  } else if (platform === 'windows') {
    paths.push(path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'));
  }

  // Cursor
  paths.push(path.join(home, '.cursor', 'mcp.json'));

  // Cline
  if (platform === 'macos') {
    paths.push(path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'));
  } else if (platform === 'linux') {
    paths.push(path.join(home, '.config', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'));
  } else if (platform === 'windows') {
    paths.push(path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'));
  }

  // Windsurf
  paths.push(path.join(home, '.codeium', 'windsurf', 'mcp_config.json'));

  // VS Code
  if (platform === 'macos') {
    paths.push(path.join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json'));
  } else if (platform === 'linux') {
    paths.push(path.join(home, '.config', 'Code', 'User', 'mcp.json'));
  } else if (platform === 'windows') {
    paths.push(path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'mcp.json'));
  }

  // Continue.dev
  paths.push(path.join(home, '.continue', 'config.json'));

  // Zed
  paths.push(path.join(home, '.config', 'zed', 'settings.json'));

  // mcphub.nvim
  paths.push(path.join(home, '.config', 'mcphub', 'servers.json'));

  return paths;
}

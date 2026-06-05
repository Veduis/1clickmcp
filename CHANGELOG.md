# Changelog

## 1.1.0 (2026-06-05)

- feat: Add `normalizeServer()` to handle both old sparse API format and new enriched format
- feat: Extension now works regardless of whether API returns basic or full server data
- feat: Prominent "View Full Documentation on VePrompts" button in server detail panel
- fix: Webview safely handles missing fields (stars, language, license, author) with defaults
- fix: `vepromptsUrl` fallback to constructed URL if missing from API response
- fix: `envVars` derived from `env` object when new format not available
- fix: `installMethods`, `tools`, `compatibility`, `rating` all have sensible defaults

## 1.0.9 (2026-06-05)

- fix: Update McpServer type to match enriched API with stars, title, category, vepromptsUrl
- fix: ServerTreeProvider shows ⭐ star counts and category server counts (e.g., "Productivity (6 servers)")
- fix: ServerTreeProvider uses official/featured badges and proper icons
- fix: ServerDetailPanel webview matches original screenshot design
- fix: "View full documentation on VePrompts" link now uses correct vepromptsUrl field
- fix: Fallback data matches new rich type format

## 1.0.8 (2026-06-05)

- feat: Add ServerDetailPanel webview — clicking a server now opens a rich detail panel inside VS Code instead of an external browser tab
- feat: Panel shows install/uninstall buttons, copy command, client compatibility, and GitHub link
- feat: Real-time install status detection and UI updates
- fix: Restore expected in-IDE server browsing experience

## 1.0.6 (2026-06-05)

- fix: Update default catalogUrl in package.json to `/api/mcp-catalog.json`
- fix: Ensure extension fetches from correct static JSON endpoint

## 1.0.5 (2026-06-05)

- fix: Update catalog URL to `/api/mcp-catalog.json` for static file serving
- fix: Generate static JSON catalog at build time (91 servers)
- fix: Git commits now properly attributed to Veduis (not VePrompts)

## 1.0.4 (2026-06-05)

- fix: Replace incorrect icon with proper VePrompts brand logo (128x128 PNG)
- fix: Make server tree items clickable — opens server detail page on VePrompts
- fix: Expand fallback catalog from 3 to 15 servers across more categories
- fix: Split Open VSX keywords into separate `devin` and `windsurf` tags
- docs: Rebrand Windsurf to Devin (formerly Windsurf) across all references

## 1.0.3 (2026-06-05)

- fix: Change publisher from `veprompts` to `veduis` to resolve Open VSX unverified publisher warning
- fix: Add `icon.png` to extension root for Open VSX marketplace display
- docs: Update author attribution to Veduis

## 1.0.2 (2026-06-05)

- docs: Add live Open VSX Registry link (https://open-vsx.org/extension/Veduis/1-click-mcp-installer)
- docs: Add Veduis blog launch announcement backlink to README

## 1.0.1 (2026-06-05)

- docs: Add live Open VSX Registry link
- docs: Add Veduis blog launch announcement backlink to README

## 1.0.0 (2026-06-05)

- Initial release
- Support for 8 MCP clients: Claude Desktop, Cursor, Cline, Devin (formerly Windsurf), VS Code, Continue.dev, Zed, mcphub.nvim
- Auto-detection of installed clients
- One-click server installation
- Environment variable prompting
- Server catalog with fallback data
- Multi-platform support (macOS, Linux, Windows)

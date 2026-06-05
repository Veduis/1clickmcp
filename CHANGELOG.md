# Changelog

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

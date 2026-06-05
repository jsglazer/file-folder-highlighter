# Hierarchy Highlighter

An Obsidian plugin that provides visual highlighting for files and folders in the file explorer.

## Features

- **Custom colors for files/folders**: Right-click any file or folder to assign a custom font and background color from your defined palette.
- **Parent hierarchy highlighting**: Automatically highlights all ancestor folders of the currently active file. Toggle on/off via settings or command.
- **Regex-based highlighting**: Define regex patterns with associated colors that apply to matching file/folder names. Supports targeting files, folders, or both.

## Settings

- Define unlimited custom color combinations (font + background)
- Color pickers for hierarchy and regex highlight colors
- Regex validation with live feedback (invalid patterns shown in red)
- Per-rule scope: files only, folders only, or both

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/hierarchy-highlighter/` folder.
2. Enable the plugin in Obsidian Settings → Community Plugins.

## Version

1.0.0

## License

MIT

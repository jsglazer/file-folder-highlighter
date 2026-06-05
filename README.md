# Dynamic File & Folder Highlighter

An Obsidian plugin that provides rich visual highlighting for files and folders in the file explorer.

## Features

- **Custom colors for files/folders**: Right-click any file or folder → "Color options" to assign a named color combination. Font and background colors are each optional — leave either unset to keep the Obsidian default.
- **Parent hierarchy highlighting**: Automatically highlights all ancestor folders of the currently active file. Toggle on/off via settings or command palette.
- **Regex-based highlighting**: Define regex patterns with associated colors that apply to matching file/folder names. Supports targeting files, folders, or both.
- **Conditional highlighting**: Highlight the file with the highest or lowest numeric value in folders matching a name pattern. Example: automatically highlight the latest `UpdateNN.md` file across all `Updates` folders.

## Settings

- Define unlimited named color combinations (font + background; each color is optional)
- Hierarchy color pickers with optional override (leave unset for Obsidian default)
- Regex rules with live validation (invalid patterns shown in red)
- Conditional rules: folder name regex + file name regex with numeric capture group + max/min condition

## Priority

When multiple rules match the same file/folder, later rules win:

1. Regex rules (lowest)
2. Conditional rules
3. Hierarchy (ancestor folders of active file)
4. Explicit right-click assignments (highest)

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/dynamic-file-folder-highlighter/` folder.
2. Enable the plugin in Obsidian Settings → Community Plugins.

## Version

1.1.0

## License

MIT

# Dynamic File & Folder Highlighter

An Obsidian plugin that provides rich and flexible visual highlighting for files and folders in the file explorer (and tab header if desired).

## Features

- **Custom colors for files/folders**: Right-click any file or folder → "Ff/Fld Color Options" to assign a named color combination. Font and background colors are each optional — leave either unset to keep the Obsidian default.
- **Parent hierarchy highlighting**: Automatically highlights all ancestor folders of the currently active file. Toggle on/off via settings or command palette.
- **Regex-based highlighting**: Define regex patterns with associated colors that apply to matching file/folder names. Supports targeting files, folders, or both. File patterns match against the **basename** (no extension), so `\bDev$` matches `MyNoteDev.md` — write patterns as if the `.md` isn't there.
- **YAML frontmatter rules**: Apply colors to files based on a specific key/value in their frontmatter (e.g. `status: Refine`). Updates live as you edit files. Files only — folders have no frontmatter.
- **Conditional highlighting**: Highlight the file with the highest or lowest numeric value in folders matching a name pattern. Example: automatically highlight the latest `UpdateNN.md` file across all `Updates` folders.

## Settings

- Define unlimited named color combinations (font + background; each color is optional)
- Hierarchy color pickers with optional override (leave unset for Obsidian default)
- Regex rules with live validation (invalid patterns shown in red); file patterns match the basename — no need to account for the `.md` extension
- YAML rules: key + exact value (case-sensitive trim match)
- Conditional rules: folder name regex + file name regex with numeric capture group + max/min condition
- Regex and conditional rules can optionally be applied to the evaluated tab header.

## Priority

When multiple rules match the same file/folder, later rules win:

1. Regex rules (lowest)
2. YAML frontmatter rules
3. Conditional rules
4. Hierarchy (ancestor folders of active file)
5. Explicit right-click assignments (highest)

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/dynamic-file-folder-highlighter/` folder.
2. Enable the plugin in Obsidian Settings → Community Plugins.

## Version

1.2.5

## License

MIT

Made with Claude!

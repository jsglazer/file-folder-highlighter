# File and Folder Highlighter

[![GitHub release](https://img.shields.io/github/v/release/jsglazer/file-folder-highlighter?logo=github)](https://github.com/jsglazer/file-folder-highlighter/releases)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/jsglazer/file-folder-highlighter/blob/main/LICENSE)
[![Made with Claude](https://img.shields.io/badge/Made_with-Claude-D97756?logo=anthropic)](https://claude.ai)
[![Gemini Flash Antigravity](https://img.shields.io/badge/Gemini%20Flash-Antigravity-4f86f7?logo=google-gemini&logoColor=white)](https://github.com/google-gemini)
[![CI](https://github.com/jsglazer/file-folder-highlighter/actions/workflows/ci.yml/badge.svg)](https://github.com/jsglazer/file-folder-highlighter/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jsglazer/file-folder-highlighter/actions/workflows/codeql.yml/badge.svg)](https://github.com/jsglazer/file-folder-highlighter/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jsglazer/file-folder-highlighter/badge)](https://securityscorecards.dev/viewer/?uri=github.com/jsglazer/file-folder-highlighter)

An Obsidian plugin that provides rich and flexible visual highlighting for files and folders in the file explorer (and tab header if desired).

## Features

- **Custom colors for files/folders**: Right-click any file or folder → "File/folder color options" to assign a named color combination. Font and background colors are each optional — leave either unset to keep the Obsidian default.
- **Parent hierarchy highlighting**: Automatically highlights all ancestor folders of the currently active file. Toggle on/off via settings or command palette.
- **Regex-based highlighting**: Define regex patterns with associated colors that apply to matching file/folder names. Supports targeting files, folders, or both. File patterns match against the **basename** (no extension), so `\bDev$` matches `MyNoteDev.md` — write patterns as if the `.md` isn't there. The settings panel shows up to 3 matching files/folders below each rule so you can confirm the pattern is right.
- **YAML frontmatter rules**: Apply colors to files based on a specific key/value in their frontmatter (e.g. `Status: Refine`). Updates live as you edit files. Files only — folders have no frontmatter.
- **Conditional highlighting**: Highlight the file with the highest or lowest numeric value in folders matching a name pattern. Example: automatically highlight the latest `UpdateNN.md` file across all `Updates` folders.
- **Separate light/dark colors**: Every color (combinations, regex, YAML, conditional, and hierarchy) has independent light-theme and dark-theme variants, swapped automatically when you switch Obsidian themes.

## Settings

- Define unlimited named color combinations (font + background; each color is optional, with separate light/dark variants)
- Hierarchy color pickers with optional override (leave unset for Obsidian default), separate light/dark variants
- Regex rules with live validation (invalid patterns shown in red); file patterns match the basename — no need to account for the `.md` extension; shows up to 3 random matching examples live as you edit the pattern
- YAML rules: key + exact value (case-sensitive trim match)
- Conditional rules: folder name regex + file name regex with numeric capture group + max/min condition
- Color combinations, regex rules, and conditional rules can each optionally be applied to the evaluated tab header.

## Priority

When multiple rules match the same file/folder, later rules win:

1. Regex rules (lowest)
2. YAML frontmatter rules
3. Conditional rules
4. Hierarchy (ancestor folders of active file)
5. Explicit right-click assignments (highest)

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/file-folder-highlighter/` folder.
2. Enable the plugin in Obsidian Settings → Community Plugins.

## Version

1.3.0

## License

MIT

Made with Claude!

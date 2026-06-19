# Security Policy

## Supported versions

Only the latest released version of File and Folder Highlighter receives
fixes. Please update to the newest release before reporting an issue.

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue:

- Use GitHub's **"Report a vulnerability"** button (Security tab → Privately report
  a vulnerability):
  <https://github.com/jsglazer/file-folder-highlighter/security/advisories/new>
- or open a regular issue **without** sensitive details and ask for a private channel.

Please include reproduction steps and the plugin version (see `manifest.json`). We aim
to acknowledge reports within 14 days and to release a fix in a subsequent version.

## Scope & threat model

File and Folder Highlighter runs inside Obsidian and applies custom colors
to files and folders based on right-click choices, YAML frontmatter rules, and
regex/conditional rules.

- The plugin makes **no network requests**, adds no telemetry, and stores no
  secrets — all state lives in the plugin's own settings.
- User-supplied rule input (colors, frontmatter values, regular expressions) is
  treated as untrusted and applied through Obsidian's API and CSS, not by injecting
  raw HTML.
- File/folder access uses the sandboxed Obsidian Vault API.

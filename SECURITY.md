# Security Policy

## Supported versions

Only the latest released version of Dynamic File and Folder Highlighter receives
fixes. Please update to the newest release before reporting an issue.

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue:

- Use GitHub's **"Report a vulnerability"** button under the repository's
  **Security** tab (Privately report a vulnerability), or
- open a regular issue **without** sensitive details and ask for a private channel.

Please include reproduction steps and the plugin version (see `manifest.json`).
You can expect an initial response within a reasonable time; fixes are released as
a new version.

## Scope & threat model

Dynamic File and Folder Highlighter runs inside Obsidian and applies custom colors
to files and folders based on right-click choices, YAML frontmatter rules, and
regex/conditional rules.

- The plugin makes **no network requests**, adds no telemetry, and stores no
  secrets — all state lives in the plugin's own settings.
- User-supplied rule input (colors, frontmatter values, regular expressions) is
  treated as untrusted and applied through Obsidian's API and CSS, not by injecting
  raw HTML.
- File/folder access uses the sandboxed Obsidian Vault API.

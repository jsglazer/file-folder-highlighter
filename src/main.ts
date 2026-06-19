import {
	Plugin,
	TFile,
	TFolder,
	TAbstractFile,
	Menu,
	MenuItem,
	Notice,
	WorkspaceLeaf,
	debounce,
} from 'obsidian';
import { FileFolderHighlighterSettings, ThemedColors, migrateSettings } from './settings';
import { FileFolderHighlighterSettingTab } from './settingsTab';

// Colors are applied to element styles; only accept hex values (which is all
// the color pickers can produce) so a hand-edited data.json can't inject
// arbitrary CSS values.
const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$/;

type NavStyle = { font: string; bg: string };

// Undocumented leaf members used for tab-header styling, narrowed to the
// shapes we actually read so the rest of the code stays type-safe.
interface TabLeaf {
	tabHeaderEl?: HTMLElement;
	tabHeaderInnerTitleEl?: HTMLElement;
}

// Undocumented MenuItem.setSubmenu(); guarded by a capability check before use.
interface MenuItemWithSubmenu {
	setSubmenu(): Menu;
}

export default class FileFolderHighlighterPlugin extends Plugin {
	settings!: FileFolderHighlighterSettings;
	private currentHierarchyPaths: Set<string> = new Set();

	// Path → style maps computed by updateStyles(); applyStyles() reads them so
	// re-applying after a DOM rebuild never has to re-evaluate the rules.
	private navFileStyles: Map<string, NavStyle> = new Map();
	private navFolderStyles: Map<string, NavStyle> = new Map();
	private tabStyleMap: Map<string, NavStyle> = new Map();

	// Elements we've applied inline styles to, tracked so teardown is exact and
	// works across popout windows without scanning any document.
	private styledEls: Set<HTMLElement> = new Set();

	private explorerObserver: MutationObserver | null = null;
	private observedContainers: Set<HTMLElement> = new Set();

	private debouncedUpdate = debounce(() => this.updateStyles(), 250, true);
	// Re-apply (no rule re-evaluation) when the file-explorer DOM changes.
	private debouncedApply = debounce(() => this.applyStyles(), 50, true);

	/** Debounced save + refresh for rapid-fire settings inputs (typing, color drag). */
	scheduleSaveAndUpdate = debounce(
		() => {
			this.saveSettings().catch(console.error);
			this.updateStyles();
		},
		250,
		true,
	);

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new FileFolderHighlighterSettingTab(this.app, this));

		this.addCommand({
			id: 'toggle-hierarchy-highlighting',
			name: 'Toggle hierarchy highlighting',
			callback: async () => {
				this.settings.hierarchyEnabled = !this.settings.hierarchyEnabled;
				await this.saveSettings();
				this.updateStyles();
				new Notice(
					`Hierarchy highlighting ${this.settings.hierarchyEnabled ? 'enabled' : 'disabled'}`,
				);
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				this.buildColorMenu(menu, file);
			}),
		);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.updateHierarchy();
				this.applyStyles();
				// Schedule deferred to capture asynchronous view attachment
				window.setTimeout(() => {
					this.applyStyles();
				}, 100);
			}),
		);

		this.registerEvent(
			this.app.vault.on('create', () => {
				this.debouncedUpdate();
			}),
		);

		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				// Folder renames must also rewrite entries for descendants; Obsidian
				// does not guarantee per-child rename events.
				const prefix = oldPath + '/';
				let changed = false;
				for (const entry of this.settings.fileColors) {
					if (entry.path === oldPath) {
						entry.path = file.path;
						changed = true;
					} else if (entry.path.startsWith(prefix)) {
						entry.path = file.path + '/' + entry.path.slice(prefix.length);
						changed = true;
					}
				}
				if (changed) await this.saveSettings();
				this.debouncedUpdate();
			}),
		);

		this.registerEvent(
			this.app.vault.on('delete', async (file) => {
				const prefix = file.path + '/';
				const before = this.settings.fileColors.length;
				this.settings.fileColors = this.settings.fileColors.filter(
					(e) => e.path !== file.path && !e.path.startsWith(prefix),
				);
				if (this.settings.fileColors.length !== before) await this.saveSettings();
				this.debouncedUpdate();
			}),
		);

		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				if (this.settings.yamlRules.length === 0) return;
				this.debouncedUpdate();
			}),
		);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				// New file-explorer/tab DOM may have appeared; reconnect the observer
				// and re-apply the cached styles.
				this.setupExplorerObserver();
				this.applyStyles();
				// Schedule deferred to capture asynchronous view attachment
				window.setTimeout(() => {
					this.setupExplorerObserver();
					this.applyStyles();
				}, 100);
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.updateHierarchy();
			this.updateStyles();
			this.setupExplorerObserver();
			window.setTimeout(() => {
				this.setupExplorerObserver();
				this.applyStyles();
			}, 100);
		});

		this.registerDomEvent(window, 'focus', () => {
			this.applyStyles();
		});

		// Re-evaluate colors when the user switches between light/dark theme.
		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				this.updateStyles();
			}),
		);
	}

	onunload() {
		this.debouncedUpdate.cancel();
		this.debouncedApply.cancel();
		this.scheduleSaveAndUpdate.cancel();
		this.explorerObserver?.disconnect();
		this.explorerObserver = null;
		this.clearAppliedStyles();
		// Persist any change captured by a still-pending debounced save.
		void this.saveSettings();
	}

	async loadSettings() {
		this.settings = migrateSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private buildColorMenu(menu: Menu, file: TAbstractFile) {
		const hasColor = this.settings.fileColors.some((e) => e.path === file.path);
		if (this.settings.colorCombos.length === 0 && !hasColor) return;

		// setSubmenu is an undocumented API; degrade to flat menu items rather
		// than throwing inside the file-menu builder if Obsidian removes it.
		const proto = MenuItem.prototype as Partial<MenuItemWithSubmenu>;
		const hasSubmenu = typeof proto.setSubmenu === 'function';
		if (!hasSubmenu) {
			this.settings.colorCombos.forEach((combo) => {
				menu.addItem((item: MenuItem) => {
					item
						.setTitle(`Color: ${combo.name || 'Unnamed'}`)
						.setSection('ffh-colors')
						.onClick(async () => {
							await this.setFileColor(file.path, combo.id);
						});
				});
			});
			if (hasColor) {
				menu.addItem((item: MenuItem) => {
					item
						.setTitle('Clear color')
						.setIcon('x-circle')
						.setSection('ffh-colors')
						.onClick(async () => {
							await this.clearFileColor(file.path);
						});
				});
			}
			return;
		}

		menu.addItem((item: MenuItem) => {
			item.setTitle('File/folder color options').setSection('ffh-colors');
			const submenu = (item as unknown as MenuItemWithSubmenu).setSubmenu();

			this.settings.colorCombos.forEach((combo) => {
				submenu.addItem((subItem: MenuItem) => {
					const title = createFragment((frag) => {
						const span = frag.createSpan({ text: combo.name || 'Unnamed' });
						const { font, bg } = this.pickColors(combo);
						if (font || bg) {
							span.setCssStyles({
								padding: '1px 8px',
								borderRadius: '3px',
								...(font ? { color: font } : {}),
								...(bg ? { backgroundColor: bg } : {}),
							});
						}
					});
					subItem.setTitle(title).onClick(async () => {
						await this.setFileColor(file.path, combo.id);
					});
				});
			});

			if (hasColor) {
				submenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Clear color')
						.setIcon('x-circle')
						.onClick(async () => {
							await this.clearFileColor(file.path);
						});
				});
			}
		});
	}

	async setFileColor(path: string, comboId: string) {
		const idx = this.settings.fileColors.findIndex((e) => e.path === path);
		if (idx >= 0) {
			this.settings.fileColors[idx].comboId = comboId;
		} else {
			this.settings.fileColors.push({ path, comboId });
		}
		await this.saveSettings();
		this.updateStyles();
	}

	async clearFileColor(path: string) {
		this.settings.fileColors = this.settings.fileColors.filter((e) => e.path !== path);
		await this.saveSettings();
		this.updateStyles();
	}

	private updateHierarchy() {
		this.currentHierarchyPaths = new Set();
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const parts = activeFile.path.split('/');
			for (let i = 1; i < parts.length; i++) {
				this.currentHierarchyPaths.add(parts.slice(0, i).join('/'));
			}
		}
		// Paths are kept current on every leaf change so enabling the feature
		// later works immediately, but styles only need refreshing when enabled.
		if (this.settings.hierarchyEnabled) this.debouncedUpdate();
	}

	private isDarkTheme(): boolean {
		return activeDocument.body.classList.contains('theme-dark');
	}

	/** Resolves a rule's Light/Dark pair down to the colors active for the current theme. */
	private pickColors(t: ThemedColors): NavStyle {
		const safe = (c: string) => (SAFE_COLOR.test(c) ? c : '');
		const dark = this.isDarkTheme();
		return {
			font: safe(dark ? t.fontColorDark : t.fontColorLight),
			bg: safe(dark ? t.bgColorDark : t.bgColorLight),
		};
	}

	updateStyles() {
		const navFile = new Map<string, NavStyle>();
		const navFolder = new Map<string, NavStyle>();
		const tabStyles = new Map<string, NavStyle>();

		const files = this.app.vault.getFiles();
		const folders = this.getAllFolders();

		// 1. Regex rules — lowest priority
		for (const rule of this.settings.regexRules) {
			if (!rule.pattern) continue;
			const { font, bg } = this.pickColors(rule);
			if (!font && !bg) continue;
			let regex: RegExp;
			try {
				regex = new RegExp(rule.pattern);
			} catch {
				continue;
			}
			const style: NavStyle = { font, bg };

			if (rule.appliesTo !== 'folders') {
				for (const file of files) {
					if (regex.test(file.basename)) {
						navFile.set(file.path, style);
						if (rule.applyToTab) tabStyles.set(file.path, style);
					}
				}
			}
			if (rule.appliesTo !== 'files') {
				for (const folder of folders) {
					if (regex.test(folder.name)) navFolder.set(folder.path, style);
				}
			}
		}

		// 2. YAML frontmatter rules — files only
		for (const rule of this.settings.yamlRules) {
			if (!rule.key || !rule.value) continue;
			const { font, bg } = this.pickColors(rule);
			if (!font && !bg) continue;
			const target = rule.value.trim();
			const style: NavStyle = { font, bg };
			for (const file of files) {
				const fm: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!fm || typeof fm !== 'object') continue;
				const val: unknown = (fm as Record<string, unknown>)[rule.key];
				if (val === undefined || val === null) continue;
				const toComparable = (v: unknown): string => {
					if (typeof v === 'string') return v.trim();
					if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
					return '';
				};
				const matches = Array.isArray(val)
					? val.some((v) => toComparable(v) === target)
					: toComparable(val) === target;
				if (matches) navFile.set(file.path, style);
			}
		}

		// 3. Conditional rules — select max/min file in matching folders
		for (const rule of this.settings.conditionalRules) {
			if (!rule.folderPattern || !rule.filePattern) continue;
			const { font, bg } = this.pickColors(rule);
			if (!font && !bg) continue;
			let folderRe: RegExp, fileRe: RegExp;
			try {
				folderRe = new RegExp(rule.folderPattern);
			} catch {
				continue;
			}
			try {
				fileRe = new RegExp(rule.filePattern);
			} catch {
				continue;
			}
			const style: NavStyle = { font, bg };

			for (const folder of folders) {
				if (!folderRe.test(folder.name)) continue;
				const candidates: { file: TFile; value: number }[] = [];
				for (const child of folder.children) {
					if (!(child instanceof TFile)) continue;
					const m = fileRe.exec(child.basename);
					if (m?.[1] !== undefined) {
						const val = parseFloat(m[1]);
						if (!isNaN(val)) candidates.push({ file: child, value: val });
					}
				}
				if (candidates.length === 0) continue;
				const winner = candidates.reduce((best, cur) =>
					rule.condition === 'max'
						? cur.value > best.value
							? cur
							: best
						: cur.value < best.value
							? cur
							: best,
				);
				navFile.set(winner.file.path, style);
				if (rule.applyToTab) tabStyles.set(winner.file.path, style);
			}
		}

		// 4. Hierarchy — highlights ancestor folders of the active file
		if (this.settings.hierarchyEnabled) {
			const { font, bg } = this.pickColors({
				fontColorLight: this.settings.hierarchyFontColorLight,
				bgColorLight: this.settings.hierarchyBgColorLight,
				fontColorDark: this.settings.hierarchyFontColorDark,
				bgColorDark: this.settings.hierarchyBgColorDark,
			});
			if (font || bg) {
				const style: NavStyle = { font, bg };
				for (const path of this.currentHierarchyPaths) navFolder.set(path, style);
			}
		}

		// 5. Explicit file/folder assignments — highest priority
		for (const entry of this.settings.fileColors) {
			const combo = this.settings.colorCombos.find((c) => c.id === entry.comboId);
			if (!combo) continue;
			const { font, bg } = this.pickColors(combo);
			if (!font && !bg) continue;
			const style: NavStyle = { font, bg };
			// A path is either a file or a folder; set both, only the matching
			// element will exist in the explorer DOM.
			navFile.set(entry.path, style);
			navFolder.set(entry.path, style);
			if (combo.applyToTab) tabStyles.set(entry.path, style);
		}

		this.navFileStyles = navFile;
		this.navFolderStyles = navFolder;
		this.tabStyleMap = tabStyles;
		this.applyStyles();
	}

	private getFileExplorerContainers(): HTMLElement[] {
		return this.app.workspace.getLeavesOfType('file-explorer').map((l) => l.view.containerEl);
	}

	private setupExplorerObserver() {
		const containers = this.getFileExplorerContainers();
		const currentSet = new Set(containers);

		// Check if the containers are exactly the same as the observed ones
		let same = currentSet.size === this.observedContainers.size;
		if (same) {
			for (const c of containers) {
				if (!this.observedContainers.has(c)) {
					same = false;
					break;
				}
			}
		}

		if (same) return;

		this.explorerObserver?.disconnect();
		this.observedContainers = currentSet;

		if (containers.length === 0) {
			this.explorerObserver = null;
			return;
		}

		// The explorer rebuilds title nodes on folder expand/collapse and while
		// virtualizing on scroll, so re-apply inline styles when its DOM changes.
		// We observe childList only — our own style/class changes are attribute
		// mutations and won't retrigger this.
		this.explorerObserver = new MutationObserver(() => this.debouncedApply());
		for (const c of containers) {
			this.explorerObserver.observe(c, { childList: true, subtree: true });
		}
	}

	private applyStyles() {
		this.setupExplorerObserver();
		this.clearAppliedStyles();
		this.applyNavStyles();
		this.applyTabStyles();
	}

	private applyTo(el: HTMLElement, style: NavStyle) {
		// !important is required because some themes set nav/tab title colors with
		// !important (notably Obsidian's active-tab title color).
		if (style.font) el.style.setProperty('color', style.font, 'important');
		if (style.bg) el.style.setProperty('background-color', style.bg, 'important');
		el.addClass('ffh-styled');
		this.styledEls.add(el);
	}

	private clearAppliedStyles() {
		for (const el of this.styledEls) {
			el.style.removeProperty('color');
			el.style.removeProperty('background-color');
			el.removeClass('ffh-styled');
		}
		this.styledEls.clear();
	}

	private applyNavStyles() {
		if (this.navFileStyles.size === 0 && this.navFolderStyles.size === 0) return;
		for (const container of this.getFileExplorerContainers()) {
			container.querySelectorAll<HTMLElement>('.nav-file-title').forEach((el) => {
				const path = el.getAttribute('data-path');
				if (!path) return;
				const style = this.navFileStyles.get(path);
				if (style) this.applyTo(el, style);
			});
			container.querySelectorAll<HTMLElement>('.nav-folder-title').forEach((el) => {
				const path = el.getAttribute('data-path');
				if (!path) return;
				const style = this.navFolderStyles.get(path);
				if (style) this.applyTo(el, style);
			});
		}
	}

	private applyTabStyles() {
		if (this.tabStyleMap.size === 0) return;
		this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			const file = (leaf.view as { file?: TFile }).file;
			if (!file) return;
			const style = this.tabStyleMap.get(file.path);
			if (!style) return;
			// Prefer the inner title element so Obsidian's active/inactive tab
			// background indicator (which lives on tabHeaderEl, not the inner title)
			// stays visible; both members are undocumented, hence the guards.
			const tl = leaf as unknown as TabLeaf;
			const target = tl.tabHeaderInnerTitleEl ?? tl.tabHeaderEl;
			if (!target) return;
			this.applyTo(target, style);
		});
	}

	getAllFolders(): TFolder[] {
		return this.app.vault
			.getAllLoadedFiles()
			.filter((f): f is TFolder => f instanceof TFolder && f.path !== '/' && f.path !== '');
	}
}

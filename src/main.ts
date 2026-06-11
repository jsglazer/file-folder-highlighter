import { Plugin, TFile, TFolder, TAbstractFile, Menu, MenuItem, Notice, debounce } from 'obsidian';
import { DynamicFileFolderHighlighterSettings, DEFAULT_SETTINGS } from './settings';
import { DynamicFileFolderHighlighterSettingTab } from './settingsTab';

// Colors are interpolated into CSS text; only accept hex values (which is all
// the color pickers can produce) so a hand-edited data.json can't inject CSS.
const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export default class DynamicFileFolderHighlighterPlugin extends Plugin {
  settings!: DynamicFileFolderHighlighterSettings;
  private styleEl!: HTMLStyleElement;
  private currentHierarchyPaths: Set<string> = new Set();
  // Computed as a byproduct of updateStyles(); applyTabStyles() reads from it
  // so layout-change handling never has to rescan the vault.
  private tabStyleMap: Map<string, { font: string; bg: string }> = new Map();

  private debouncedUpdate = debounce(() => this.updateStyles(), 250, true);

  /** Debounced save + refresh for rapid-fire settings inputs (typing, color drag). */
  scheduleSaveAndUpdate = debounce(() => {
    this.saveSettings().catch(console.error);
    this.updateStyles();
  }, 250, true);

  async onload() {
    await this.loadSettings();

    this.styleEl = document.createElement('style');
    this.styleEl.id = 'dffh-styles';
    document.head.appendChild(this.styleEl);

    this.addSettingTab(new DynamicFileFolderHighlighterSettingTab(this.app, this));

    this.addCommand({
      id: 'toggle-hierarchy-highlighting',
      name: 'Toggle hierarchy highlighting',
      callback: async () => {
        this.settings.hierarchyEnabled = !this.settings.hierarchyEnabled;
        await this.saveSettings();
        this.updateStyles();
        new Notice(`Hierarchy highlighting ${this.settings.hierarchyEnabled ? 'enabled' : 'disabled'}`);
      },
    });

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        this.buildColorMenu(menu, file);
      })
    );

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.updateHierarchy();
      })
    );

    this.registerEvent(
      this.app.vault.on('create', () => {
        this.debouncedUpdate();
      })
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
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', async (file) => {
        const prefix = file.path + '/';
        const before = this.settings.fileColors.length;
        this.settings.fileColors = this.settings.fileColors.filter(
          e => e.path !== file.path && !e.path.startsWith(prefix)
        );
        if (this.settings.fileColors.length !== before) await this.saveSettings();
        this.debouncedUpdate();
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', () => {
        if (this.settings.yamlRules.length === 0) return;
        this.debouncedUpdate();
      })
    );

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.applyTabStyles();
      })
    );

    this.app.workspace.onLayoutReady(() => {
      this.updateHierarchy();
      this.updateStyles();
    });
  }

  onunload() {
    this.scheduleSaveAndUpdate.run();
    this.debouncedUpdate.cancel();
    this.styleEl.remove();
    this.clearTabStyles();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private buildColorMenu(menu: Menu, file: TAbstractFile) {
    const hasColor = this.settings.fileColors.some(e => e.path === file.path);
    if (this.settings.colorCombos.length === 0 && !hasColor) return;

    // setSubmenu is an undocumented API; degrade to flat menu items rather
    // than throwing inside the file-menu builder if Obsidian removes it.
    const hasSubmenu = typeof (MenuItem.prototype as any)?.setSubmenu === 'function';
    if (!hasSubmenu) {
      this.settings.colorCombos.forEach((combo) => {
        menu.addItem((item: MenuItem) => {
          item.setTitle(`Color: ${combo.name || 'Unnamed'}`).setSection('dffh-colors').onClick(async () => {
            await this.setFileColor(file.path, combo.id);
          });
        });
      });
      if (hasColor) {
        menu.addItem((item: MenuItem) => {
          item.setTitle('Clear color').setIcon('x-circle').setSection('dffh-colors').onClick(async () => {
            await this.clearFileColor(file.path);
          });
        });
      }
      return;
    }

    menu.addItem((item: MenuItem) => {
      item.setTitle('Ff/Fld Color Options').setSection('dffh-colors');
      const submenu = (item as any).setSubmenu() as Menu;

      this.settings.colorCombos.forEach((combo) => {
        submenu.addItem((subItem: MenuItem) => {
          const frag = document.createDocumentFragment();
          const span = document.createElement('span');
          span.textContent = combo.name || 'Unnamed';
          if (combo.fontColor || combo.bgColor) {
            if (combo.fontColor) span.style.color = combo.fontColor;
            if (combo.bgColor) span.style.backgroundColor = combo.bgColor;
            span.style.padding = '1px 8px';
            span.style.borderRadius = '3px';
          }
          frag.appendChild(span);
          subItem.setTitle(frag).onClick(async () => {
            await this.setFileColor(file.path, combo.id);
          });
        });
      });

      if (hasColor) {
        submenu.addItem((subItem: MenuItem) => {
          subItem.setTitle('Clear color').setIcon('x-circle').onClick(async () => {
            await this.clearFileColor(file.path);
          });
        });
      }
    });
  }

  async setFileColor(path: string, comboId: string) {
    const idx = this.settings.fileColors.findIndex(e => e.path === path);
    if (idx >= 0) {
      this.settings.fileColors[idx].comboId = comboId;
    } else {
      this.settings.fileColors.push({ path, comboId });
    }
    await this.saveSettings();
    this.updateStyles();
  }

  async clearFileColor(path: string) {
    this.settings.fileColors = this.settings.fileColors.filter(e => e.path !== path);
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

  updateStyles() {
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const safe = (c: string) => (SAFE_COLOR.test(c) ? c : '');
    const colorProps = (font: string, bg: string): string => {
      let s = '';
      if (safe(font)) s += `color:${font}!important;`;
      if (safe(bg)) s += `background-color:${bg}!important;`;
      return s;
    };
    let css = '';

    const files = this.app.vault.getFiles();
    const folders = this.getAllFolders();
    const tabStyles = new Map<string, { font: string; bg: string }>();

    // 1. Regex rules — lowest priority
    for (const rule of this.settings.regexRules) {
      if (!rule.pattern) continue;
      const ruleProps = colorProps(rule.fontColor, rule.bgColor);
      if (!ruleProps) continue;
      let regex: RegExp;
      try { regex = new RegExp(rule.pattern); } catch { continue; }

      if (rule.appliesTo !== 'folders') {
        for (const file of files) {
          if (regex.test(file.basename)) {
            css += `.nav-file-title[data-path="${esc(file.path)}"]{${ruleProps}}\n`;
            if (rule.applyToTab) {
              tabStyles.set(file.path, { font: safe(rule.fontColor), bg: safe(rule.bgColor) });
            }
          }
        }
      }
      if (rule.appliesTo !== 'files') {
        for (const folder of folders) {
          if (regex.test(folder.name)) {
            css += `.nav-folder-title[data-path="${esc(folder.path)}"]{${ruleProps}}\n`;
          }
        }
      }
    }

    // 2. YAML frontmatter rules — files only
    for (const rule of this.settings.yamlRules) {
      if (!rule.key || !rule.value) continue;
      const ruleProps = colorProps(rule.fontColor, rule.bgColor);
      if (!ruleProps) continue;
      const target = rule.value.trim();
      for (const file of files) {
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) continue;
        const val = fm[rule.key];
        if (val === undefined || val === null) continue;
        const matches = Array.isArray(val)
          ? val.some(v => String(v).trim() === target)
          : String(val).trim() === target;
        if (matches) {
          css += `.nav-file-title[data-path="${esc(file.path)}"]{${ruleProps}}\n`;
        }
      }
    }

    // 3. Conditional rules — select max/min file in matching folders
    for (const rule of this.settings.conditionalRules) {
      if (!rule.folderPattern || !rule.filePattern) continue;
      const condProps = colorProps(rule.fontColor, rule.bgColor);
      if (!condProps) continue;
      let folderRe: RegExp, fileRe: RegExp;
      try { folderRe = new RegExp(rule.folderPattern); } catch { continue; }
      try { fileRe = new RegExp(rule.filePattern); } catch { continue; }

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
          rule.condition === 'max' ? (cur.value > best.value ? cur : best) : (cur.value < best.value ? cur : best)
        );
        css += `.nav-file-title[data-path="${esc(winner.file.path)}"]{${condProps}}\n`;
        if (rule.applyToTab) {
          tabStyles.set(winner.file.path, { font: safe(rule.fontColor), bg: safe(rule.bgColor) });
        }
      }
    }

    // 4. Hierarchy — highlights ancestor folders of the active file
    if (this.settings.hierarchyEnabled) {
      const hierProps = colorProps(this.settings.hierarchyFontColor, this.settings.hierarchyBgColor);
      if (hierProps) {
        for (const path of this.currentHierarchyPaths) {
          css += `.nav-folder-title[data-path="${esc(path)}"]{${hierProps}}\n`;
        }
      }
    }

    // 5. Explicit file/folder assignments — highest priority
    for (const entry of this.settings.fileColors) {
      const combo = this.settings.colorCombos.find(c => c.id === entry.comboId);
      if (!combo) continue;
      const entryProps = colorProps(combo.fontColor, combo.bgColor);
      if (!entryProps) continue;
      css += `.nav-file-title[data-path="${esc(entry.path)}"],.nav-folder-title[data-path="${esc(entry.path)}"]{${entryProps}}\n`;
    }

    this.styleEl.textContent = css;
    this.tabStyleMap = tabStyles;
    this.applyTabStyles();
  }

  private clearTabStyles() {
    document.querySelectorAll('.dffh-tab-styled').forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.removeProperty('color');
      htmlEl.style.removeProperty('background-color');
      el.classList.remove('dffh-tab-styled');
    });
  }

  private applyTabStyles() {
    this.clearTabStyles();
    if (this.tabStyleMap.size === 0) return;

    this.app.workspace.iterateAllLeaves(leaf => {
      const file = (leaf.view as any).file as TFile | undefined;
      if (!file) return;
      const style = this.tabStyleMap.get(file.path);
      if (!style) return;
      // Prefer the inner title element so Obsidian's active/inactive tab
      // styling stays visible; tabHeaderEl/tabHeaderInnerTitleEl are
      // undocumented APIs, hence the guards.
      const tabEl = (leaf as any).tabHeaderEl as HTMLElement | undefined;
      const target = ((leaf as any).tabHeaderInnerTitleEl as HTMLElement | undefined) ?? tabEl;
      if (!target) return;
      if (style.font) target.style.setProperty('color', style.font);
      if (style.bg) target.style.setProperty('background-color', style.bg);
      target.classList.add('dffh-tab-styled');
    });
  }

  private getAllFolders(): TFolder[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((f): f is TFolder => f instanceof TFolder && f.path !== '/' && f.path !== '');
  }
}

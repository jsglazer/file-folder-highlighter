import { Plugin, TFile, TFolder, TAbstractFile, Menu, MenuItem, Notice } from 'obsidian';
import { DynamicFileFolderHighlighterSettings, DEFAULT_SETTINGS } from './settings';
import { DynamicFileFolderHighlighterSettingTab } from './settingsTab';

export default class DynamicFileFolderHighlighterPlugin extends Plugin {
  settings!: DynamicFileFolderHighlighterSettings;
  private styleEl!: HTMLStyleElement;
  private currentHierarchyPaths: Set<string> = new Set();

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
      this.app.vault.on('rename', (file, oldPath) => {
        const entry = this.settings.fileColors.find(e => e.path === oldPath);
        if (entry) {
          entry.path = file.path;
          this.saveSettings();
          this.updateStyles();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('delete', (file) => {
        const before = this.settings.fileColors.length;
        this.settings.fileColors = this.settings.fileColors.filter(e => e.path !== file.path);
        if (this.settings.fileColors.length !== before) {
          this.saveSettings();
          this.updateStyles();
        }
      })
    );

    this.registerEvent(
      this.app.metadataCache.on('changed', () => {
        this.updateStyles();
      })
    );

    this.app.workspace.onLayoutReady(() => {
      this.updateHierarchy();
      this.updateStyles();
    });
  }

  onunload() {
    this.styleEl.remove();
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

    menu.addItem((item: MenuItem) => {
      item.setTitle('Color options').setSection('dffh-colors');
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
    this.updateStyles();
  }

  updateStyles() {
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const colorProps = (font: string, bg: string): string => {
      let s = '';
      if (font) s += `color:${font}!important;`;
      if (bg) s += `background-color:${bg}!important;`;
      return s;
    };
    let css = '';

    // 1. Regex rules — lowest priority
    for (const rule of this.settings.regexRules) {
      if (!rule.pattern) continue;
      const ruleProps = colorProps(rule.fontColor, rule.bgColor);
      if (!ruleProps) continue;
      let regex: RegExp;
      try { regex = new RegExp(rule.pattern); } catch { continue; }

      if (rule.appliesTo !== 'folders') {
        for (const file of this.app.vault.getFiles()) {
          if (regex.test(file.basename)) {
            css += `.nav-file-title[data-path="${esc(file.path)}"]{${ruleProps}}\n`;
          }
        }
      }
      if (rule.appliesTo !== 'files') {
        for (const folder of this.getAllFolders()) {
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
      for (const file of this.app.vault.getFiles()) {
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) continue;
        const val = fm[rule.key];
        if (val !== undefined && val !== null && String(val).trim() === rule.value.trim()) {
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

      for (const folder of this.getAllFolders()) {
        if (!folderRe.test(folder.name)) continue;
        const children = this.app.vault.getFiles().filter(f => f.parent?.path === folder.path);
        const candidates: { file: TFile; value: number }[] = [];
        for (const f of children) {
          const m = fileRe.exec(f.basename);
          if (m?.[1] !== undefined) {
            const val = parseFloat(m[1]);
            if (!isNaN(val)) candidates.push({ file: f, value: val });
          }
        }
        if (candidates.length === 0) continue;
        const winner = candidates.reduce((best, cur) =>
          rule.condition === 'max' ? (cur.value > best.value ? cur : best) : (cur.value < best.value ? cur : best)
        );
        css += `.nav-file-title[data-path="${esc(winner.file.path)}"]{${condProps}}\n`;
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
  }

  private getAllFolders(): TFolder[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((f): f is TFolder => f instanceof TFolder && f.path !== '/' && f.path !== '');
  }
}

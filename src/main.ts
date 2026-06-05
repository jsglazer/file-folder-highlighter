import { Plugin, TFile, TFolder, TAbstractFile, Menu, MenuItem, Notice } from 'obsidian';
import { HierarchyHighlighterSettings, DEFAULT_SETTINGS } from './settings';
import { HierarchyHighlighterSettingTab } from './settingsTab';

export default class HierarchyHighlighterPlugin extends Plugin {
  settings!: HierarchyHighlighterSettings;
  private styleEl!: HTMLStyleElement;
  private currentHierarchyPaths: Set<string> = new Set();

  async onload() {
    await this.loadSettings();

    this.styleEl = document.createElement('style');
    this.styleEl.id = 'hierarchy-highlighter-styles';
    document.head.appendChild(this.styleEl);

    this.addSettingTab(new HierarchyHighlighterSettingTab(this.app, this));

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
    if (this.settings.colorCombos.length === 0) return;

    this.settings.colorCombos.forEach((combo) => {
      menu.addItem((item: MenuItem) => {
        const frag = document.createDocumentFragment();
        const span = document.createElement('span');
        span.textContent = combo.name;
        span.style.cssText = `color:${combo.fontColor};background-color:${combo.bgColor};padding:1px 8px;border-radius:3px;`;
        frag.appendChild(span);
        item.setTitle(frag).setSection('hh-colors').onClick(async () => {
          await this.setFileColor(file.path, combo.id);
        });
      });
    });

    if (this.settings.fileColors.some(e => e.path === file.path)) {
      menu.addItem((item: MenuItem) => {
        item.setTitle('Clear color').setIcon('x-circle').setSection('hh-colors').onClick(async () => {
          await this.clearFileColor(file.path);
        });
      });
    }
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
    let css = '';

    // Regex rules — lowest priority (rendered first, overridden by later blocks)
    for (const rule of this.settings.regexRules) {
      if (!rule.pattern) continue;
      let regex: RegExp;
      try { regex = new RegExp(rule.pattern); } catch { continue; }

      if (rule.appliesTo !== 'folders') {
        for (const file of this.app.vault.getFiles()) {
          if (regex.test(file.name)) {
            css += `.nav-file-title[data-path="${esc(file.path)}"]{color:${rule.fontColor}!important;background-color:${rule.bgColor}!important}\n`;
          }
        }
      }
      if (rule.appliesTo !== 'files') {
        for (const folder of this.getAllFolders()) {
          if (regex.test(folder.name)) {
            css += `.nav-folder-title[data-path="${esc(folder.path)}"]{color:${rule.fontColor}!important;background-color:${rule.bgColor}!important}\n`;
          }
        }
      }
    }

    // Hierarchy — medium priority
    if (this.settings.hierarchyEnabled) {
      for (const path of this.currentHierarchyPaths) {
        css += `.nav-folder-title[data-path="${esc(path)}"]{color:${this.settings.hierarchyFontColor}!important;background-color:${this.settings.hierarchyBgColor}!important}\n`;
      }
    }

    // Explicit file/folder assignments — highest priority
    for (const entry of this.settings.fileColors) {
      const combo = this.settings.colorCombos.find(c => c.id === entry.comboId);
      if (!combo) continue;
      css += `.nav-file-title[data-path="${esc(entry.path)}"],.nav-folder-title[data-path="${esc(entry.path)}"]{color:${combo.fontColor}!important;background-color:${combo.bgColor}!important}\n`;
    }

    this.styleEl.textContent = css;
  }

  private getAllFolders(): TFolder[] {
    return this.app.vault.getAllLoadedFiles()
      .filter((f): f is TFolder => f instanceof TFolder && f.path !== '/' && f.path !== '');
  }
}

import { App, PluginSettingTab, Setting } from 'obsidian';
import HierarchyHighlighterPlugin from './main';
import { ColorCombo, RegexRule } from './settings';

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export class HierarchyHighlighterSettingTab extends PluginSettingTab {
  plugin: HierarchyHighlighterPlugin;

  constructor(app: App, plugin: HierarchyHighlighterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── Color Combinations ────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'Color combinations' });
    containerEl.createEl('p', {
      text: 'Named color combinations you can assign to files and folders via right-click.',
      cls: 'setting-item-description',
    });

    const combosEl = containerEl.createDiv('hh-list');
    this.renderCombos(combosEl);

    new Setting(containerEl)
      .addButton(btn =>
        btn.setButtonText('Add combination').setCta().onClick(async () => {
          this.plugin.settings.colorCombos.push({
            id: genId(), name: 'New combination',
            fontColor: '#ffffff', bgColor: '#4a90d9',
          });
          await this.plugin.saveSettings();
          this.renderCombos(combosEl);
          this.plugin.updateStyles();
        })
      );

    // ── Hierarchy Highlighting ────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'Hierarchy highlighting' });

    new Setting(containerEl)
      .setName('Enable')
      .setDesc('Highlight all ancestor folders of the currently active file.')
      .addToggle(t => t
        .setValue(this.plugin.settings.hierarchyEnabled)
        .onChange(async v => {
          this.plugin.settings.hierarchyEnabled = v;
          await this.plugin.saveSettings();
          this.plugin.updateStyles();
        })
      );

    new Setting(containerEl)
      .setName('Font color')
      .addColorPicker(c => c
        .setValue(this.plugin.settings.hierarchyFontColor)
        .onChange(async v => {
          this.plugin.settings.hierarchyFontColor = v;
          await this.plugin.saveSettings();
          this.plugin.updateStyles();
        })
      );

    new Setting(containerEl)
      .setName('Background color')
      .addColorPicker(c => c
        .setValue(this.plugin.settings.hierarchyBgColor)
        .onChange(async v => {
          this.plugin.settings.hierarchyBgColor = v;
          await this.plugin.saveSettings();
          this.plugin.updateStyles();
        })
      );

    // ── Regex Rules ───────────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'Regex highlighting rules' });
    containerEl.createEl('p', {
      text: 'Apply colors to files or folders whose names match a regular expression.',
      cls: 'setting-item-description',
    });

    const rulesEl = containerEl.createDiv('hh-list');
    this.renderRules(rulesEl);

    new Setting(containerEl)
      .addButton(btn =>
        btn.setButtonText('Add rule').setCta().onClick(async () => {
          this.plugin.settings.regexRules.push({
            id: genId(), name: 'New rule', pattern: '',
            fontColor: '#ffffff', bgColor: '#e74c3c', appliesTo: 'both',
          });
          await this.plugin.saveSettings();
          this.renderRules(rulesEl);
        })
      );
  }

  // ── Combo list ──────────────────────────────────────────────────────────────

  private renderCombos(container: HTMLElement) {
    container.empty();

    if (this.plugin.settings.colorCombos.length === 0) {
      container.createEl('p', { text: 'No combinations defined.', cls: 'setting-item-description hh-empty' });
      return;
    }

    this.plugin.settings.colorCombos.forEach((combo: ColorCombo, i: number) => {
      const row = container.createDiv('hh-row');

      // Name
      const nameInput = row.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Name' });
      nameInput.type = 'text';
      nameInput.value = combo.name;
      nameInput.addEventListener('input', async () => {
        combo.name = nameInput.value;
        preview.textContent = combo.name || 'Preview';
        await this.plugin.saveSettings();
      });

      // Font color
      this.addColorInput(row, 'Font', combo.fontColor, async (v) => {
        combo.fontColor = v;
        preview.style.color = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      // Background color
      this.addColorInput(row, 'BG', combo.bgColor, async (v) => {
        combo.bgColor = v;
        preview.style.backgroundColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      // Preview
      const preview = row.createEl('span', { cls: 'hh-preview', text: combo.name || 'Preview' });
      preview.style.color = combo.fontColor;
      preview.style.backgroundColor = combo.bgColor;

      // Delete
      const del = row.createEl('button', { cls: 'hh-btn-delete' });
      del.textContent = '×';
      del.setAttribute('aria-label', 'Delete combination');
      del.addEventListener('click', async () => {
        this.plugin.settings.colorCombos.splice(i, 1);
        this.plugin.settings.fileColors = this.plugin.settings.fileColors.filter(e => e.comboId !== combo.id);
        await this.plugin.saveSettings();
        this.renderCombos(container);
        this.plugin.updateStyles();
      });
    });
  }

  // ── Regex rule list ─────────────────────────────────────────────────────────

  private renderRules(container: HTMLElement) {
    container.empty();

    if (this.plugin.settings.regexRules.length === 0) {
      container.createEl('p', { text: 'No rules defined.', cls: 'setting-item-description hh-empty' });
      return;
    }

    this.plugin.settings.regexRules.forEach((rule: RegexRule, i: number) => {
      const row = container.createDiv('hh-row');

      // Name
      const nameInput = row.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Rule name' });
      nameInput.type = 'text';
      nameInput.value = rule.name;
      nameInput.addEventListener('input', async () => {
        rule.name = nameInput.value;
        await this.plugin.saveSettings();
      });

      // Pattern (with live validation)
      const patternInput = row.createEl('input', { cls: 'hh-input hh-pattern-input', placeholder: 'Regex pattern' });
      patternInput.type = 'text';
      patternInput.value = rule.pattern;
      this.applyPatternValidation(patternInput, rule.pattern);
      patternInput.addEventListener('input', async () => {
        rule.pattern = patternInput.value;
        this.applyPatternValidation(patternInput, rule.pattern);
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      // Applies-to dropdown
      const select = row.createEl('select', { cls: 'hh-select' });
      for (const [val, label] of [['files', 'Files'], ['folders', 'Folders'], ['both', 'Files & Folders']] as [string, string][]) {
        const opt = select.createEl('option');
        opt.value = val;
        opt.textContent = label;
      }
      select.value = rule.appliesTo;
      select.addEventListener('change', async () => {
        rule.appliesTo = select.value as 'files' | 'folders' | 'both';
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      // Font color
      this.addColorInput(row, 'Font', rule.fontColor, async (v) => {
        rule.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      // Background color
      this.addColorInput(row, 'BG', rule.bgColor, async (v) => {
        rule.bgColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      // Delete
      const del = row.createEl('button', { cls: 'hh-btn-delete' });
      del.textContent = '×';
      del.setAttribute('aria-label', 'Delete rule');
      del.addEventListener('click', async () => {
        this.plugin.settings.regexRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderRules(container);
        this.plugin.updateStyles();
      });
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private addColorInput(parent: HTMLElement, label: string, value: string, onChange: (v: string) => Promise<void>) {
    const wrap = parent.createDiv('hh-color-wrap');
    wrap.createEl('span', { text: label, cls: 'hh-color-label' });
    const input = wrap.createEl('input', { cls: 'hh-color-input' });
    input.type = 'color';
    input.value = value;
    input.addEventListener('input', () => onChange(input.value));
  }

  private applyPatternValidation(input: HTMLInputElement, pattern: string) {
    if (!pattern) {
      input.classList.remove('hh-invalid');
      return;
    }
    try {
      new RegExp(pattern);
      input.classList.remove('hh-invalid');
    } catch {
      input.classList.add('hh-invalid');
    }
  }
}

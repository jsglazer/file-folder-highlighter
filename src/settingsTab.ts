import { App, PluginSettingTab, Setting } from 'obsidian';
import DynamicFileFolderHighlighterPlugin from './main';
import { ColorCombo, RegexRule, YamlRule, ConditionalRule } from './settings';

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export class DynamicFileFolderHighlighterSettingTab extends PluginSettingTab {
  plugin: DynamicFileFolderHighlighterPlugin;

  constructor(app: App, plugin: DynamicFileFolderHighlighterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── Color Combinations ────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'Color combinations' });
    containerEl.createEl('p', {
      text: 'Named color combinations you can assign to files and folders via right-click. Leave font or background unset to keep the Obsidian default.',
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

    const hierFontRow = new Setting(containerEl)
      .setName('Font color')
      .setDesc('Leave unset to use the Obsidian default.');
    this.addColorInput(hierFontRow.controlEl, '', this.plugin.settings.hierarchyFontColor, async (v) => {
      this.plugin.settings.hierarchyFontColor = v;
      await this.plugin.saveSettings();
      this.plugin.updateStyles();
    });

    const hierBgRow = new Setting(containerEl)
      .setName('Background color')
      .setDesc('Leave unset to use the Obsidian default.');
    this.addColorInput(hierBgRow.controlEl, '', this.plugin.settings.hierarchyBgColor, async (v) => {
      this.plugin.settings.hierarchyBgColor = v;
      await this.plugin.saveSettings();
      this.plugin.updateStyles();
    });

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

    // ── YAML Rules ───────────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'YAML frontmatter rules' });
    containerEl.createEl('p', {
      text: 'Apply colors to files whose frontmatter contains a specific key/value pair (e.g. status: Refine). Files only — folders have no frontmatter.',
      cls: 'setting-item-description',
    });

    const yamlRulesEl = containerEl.createDiv('hh-list');
    this.renderYamlRules(yamlRulesEl);

    new Setting(containerEl)
      .addButton(btn =>
        btn.setButtonText('Add YAML rule').setCta().onClick(async () => {
          this.plugin.settings.yamlRules.push({
            id: genId(), name: 'New rule', key: '', value: '',
            fontColor: '#ffffff', bgColor: '#27ae60',
          });
          await this.plugin.saveSettings();
          this.renderYamlRules(yamlRulesEl);
        })
      );

    // ── Conditional Rules ─────────────────────────────────────────────────────
    containerEl.createEl('h2', { text: 'Conditional highlighting rules' });
    containerEl.createEl('p', {
      text: 'Highlight the file with the highest or lowest numeric value in folders matching a name pattern.',
      cls: 'setting-item-description',
    });
    containerEl.createEl('p', {
      text: 'Example: folder pattern "^Updates$", file pattern "Update(\\d+)" with condition Max highlights the latest update file in every Updates folder.',
      cls: 'setting-item-description',
    });

    const condRulesEl = containerEl.createDiv('hh-list');
    this.renderConditionalRules(condRulesEl);

    new Setting(containerEl)
      .addButton(btn =>
        btn.setButtonText('Add conditional rule').setCta().onClick(async () => {
          this.plugin.settings.conditionalRules.push({
            id: genId(), name: 'New rule',
            fontColor: '#ffffff', bgColor: '#9b59b6',
            folderPattern: '', filePattern: '', condition: 'max',
          });
          await this.plugin.saveSettings();
          this.renderConditionalRules(condRulesEl);
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

      const nameInput = row.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Name' });
      nameInput.type = 'text';
      nameInput.value = combo.name;
      nameInput.addEventListener('input', async () => {
        combo.name = nameInput.value;
        preview.textContent = combo.name || 'Preview';
        await this.plugin.saveSettings();
      });

      this.addColorInput(row, 'Font', combo.fontColor, async (v) => {
        combo.fontColor = v;
        preview.style.color = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      this.addColorInput(row, 'BG', combo.bgColor, async (v) => {
        combo.bgColor = v;
        preview.style.backgroundColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const preview = row.createEl('span', { cls: 'hh-preview', text: combo.name || 'Preview' });
      if (combo.fontColor) preview.style.color = combo.fontColor;
      if (combo.bgColor) preview.style.backgroundColor = combo.bgColor;

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

      const nameInput = row.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Rule name' });
      nameInput.type = 'text';
      nameInput.value = rule.name;
      nameInput.addEventListener('input', async () => {
        rule.name = nameInput.value;
        await this.plugin.saveSettings();
      });

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

      this.addColorInput(row, 'Font', rule.fontColor, async (v) => {
        rule.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      this.addColorInput(row, 'BG', rule.bgColor, async (v) => {
        rule.bgColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const tabWrap = row.createDiv('hh-color-wrap');
      tabWrap.createEl('span', { text: 'Tab', cls: 'hh-color-label' });
      const tabChk = tabWrap.createEl('input');
      tabChk.type = 'checkbox';
      tabChk.checked = !!rule.applyToTab;
      tabChk.classList.add('hh-color-toggle');
      tabChk.title = 'Apply formatting to open tab header';
      tabChk.addEventListener('change', async () => {
        rule.applyToTab = tabChk.checked;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

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

  // ── YAML rule list ───────────────────────────────────────────────────────────

  private renderYamlRules(container: HTMLElement) {
    container.empty();

    if (this.plugin.settings.yamlRules.length === 0) {
      container.createEl('p', { text: 'No YAML rules defined.', cls: 'setting-item-description hh-empty' });
      return;
    }

    this.plugin.settings.yamlRules.forEach((rule: YamlRule, i: number) => {
      const row = container.createDiv('hh-row');

      const nameInput = row.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Rule name' });
      nameInput.type = 'text';
      nameInput.value = rule.name;
      nameInput.addEventListener('input', async () => {
        rule.name = nameInput.value;
        await this.plugin.saveSettings();
      });

      const keyInput = row.createEl('input', { cls: 'hh-input hh-key-input', placeholder: 'Key' });
      keyInput.type = 'text';
      keyInput.value = rule.key;
      keyInput.addEventListener('input', async () => {
        rule.key = keyInput.value.trim();
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const sep = row.createEl('span', { text: ':', cls: 'hh-yaml-sep' });
      sep.setAttribute('aria-hidden', 'true');

      const valueInput = row.createEl('input', { cls: 'hh-input hh-value-input', placeholder: 'Value' });
      valueInput.type = 'text';
      valueInput.value = rule.value;
      valueInput.addEventListener('input', async () => {
        rule.value = valueInput.value;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      this.addColorInput(row, 'Font', rule.fontColor, async (v) => {
        rule.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      this.addColorInput(row, 'BG', rule.bgColor, async (v) => {
        rule.bgColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const del = row.createEl('button', { cls: 'hh-btn-delete' });
      del.textContent = '×';
      del.setAttribute('aria-label', 'Delete rule');
      del.addEventListener('click', async () => {
        this.plugin.settings.yamlRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderYamlRules(container);
        this.plugin.updateStyles();
      });
    });
  }

  // ── Conditional rule list ────────────────────────────────────────────────────

  private renderConditionalRules(container: HTMLElement) {
    container.empty();

    if (this.plugin.settings.conditionalRules.length === 0) {
      container.createEl('p', { text: 'No conditional rules defined.', cls: 'setting-item-description hh-empty' });
      return;
    }

    this.plugin.settings.conditionalRules.forEach((rule: ConditionalRule, i: number) => {
      const group = container.createDiv('hh-cond-group');

      // Row 1: name + delete
      const row1 = group.createDiv('hh-row hh-cond-header');

      const nameInput = row1.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Rule name' });
      nameInput.type = 'text';
      nameInput.value = rule.name;
      nameInput.addEventListener('input', async () => {
        rule.name = nameInput.value;
        await this.plugin.saveSettings();
      });

      const del = row1.createEl('button', { cls: 'hh-btn-delete' });
      del.textContent = '×';
      del.setAttribute('aria-label', 'Delete rule');
      del.addEventListener('click', async () => {
        this.plugin.settings.conditionalRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderConditionalRules(container);
        this.plugin.updateStyles();
      });

      // Row 2: patterns + condition + colors
      const row2 = group.createDiv('hh-row');

      const folderInput = row2.createEl('input', { cls: 'hh-input hh-pattern-input', placeholder: 'Folder name regex' });
      folderInput.type = 'text';
      folderInput.value = rule.folderPattern;
      this.applyPatternValidation(folderInput, rule.folderPattern);
      folderInput.addEventListener('input', async () => {
        rule.folderPattern = folderInput.value;
        this.applyPatternValidation(folderInput, rule.folderPattern);
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const fileInput = row2.createEl('input', { cls: 'hh-input hh-pattern-input', placeholder: 'File name regex (capture group = number)' });
      fileInput.type = 'text';
      fileInput.value = rule.filePattern;
      this.applyPatternValidation(fileInput, rule.filePattern);
      fileInput.addEventListener('input', async () => {
        rule.filePattern = fileInput.value;
        this.applyPatternValidation(fileInput, rule.filePattern);
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const condSelect = row2.createEl('select', { cls: 'hh-select hh-cond-select' });
      for (const [val, label] of [['max', 'Max'], ['min', 'Min']] as [string, string][]) {
        const opt = condSelect.createEl('option');
        opt.value = val;
        opt.textContent = label;
      }
      condSelect.value = rule.condition;
      condSelect.addEventListener('change', async () => {
        rule.condition = condSelect.value as 'max' | 'min';
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      this.addColorInput(row2, 'Font', rule.fontColor, async (v) => {
        rule.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      this.addColorInput(row2, 'BG', rule.bgColor, async (v) => {
        rule.bgColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });

      const tabWrap = row2.createDiv('hh-color-wrap');
      tabWrap.createEl('span', { text: 'Tab', cls: 'hh-color-label' });
      const tabChk = tabWrap.createEl('input');
      tabChk.type = 'checkbox';
      tabChk.checked = !!rule.applyToTab;
      tabChk.classList.add('hh-color-toggle');
      tabChk.title = 'Apply formatting to open tab header';
      tabChk.addEventListener('change', async () => {
        rule.applyToTab = tabChk.checked;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private addColorInput(
    parent: HTMLElement,
    label: string,
    value: string,
    onChange: (v: string) => Promise<void>
  ): void {
    const wrap = parent.createDiv('hh-color-wrap');
    if (label) wrap.createEl('span', { text: label, cls: 'hh-color-label' });

    const isSet = value !== '';

    const checkbox = wrap.createEl('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isSet;
    checkbox.classList.add('hh-color-toggle');
    checkbox.title = 'Use custom color';

    const input = wrap.createEl('input', { cls: 'hh-color-input' });
    input.type = 'color';
    input.value = isSet ? value : '#ffffff';
    input.style.visibility = isSet ? 'visible' : 'hidden';

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        input.style.visibility = 'visible';
        onChange(input.value);
      } else {
        input.style.visibility = 'hidden';
        onChange('');
      }
    });

    input.addEventListener('input', () => {
      if (checkbox.checked) onChange(input.value);
    });
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

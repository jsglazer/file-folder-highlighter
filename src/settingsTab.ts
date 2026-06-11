import { App, PluginSettingTab, Setting } from 'obsidian';
import DynamicFileFolderHighlighterPlugin from './main';
import { ColorCombo, RegexRule, YamlRule, ConditionalRule } from './settings';

function genId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof (c as any).randomUUID === 'function') return (c as any).randomUUID();
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
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
    this.addColorInput(hierFontRow.controlEl, '', this.plugin.settings.hierarchyFontColor, (v) => {
      this.plugin.settings.hierarchyFontColor = v;
      this.plugin.scheduleSaveAndUpdate();
    });

    const hierBgRow = new Setting(containerEl)
      .setName('Background color')
      .setDesc('Leave unset to use the Obsidian default.');
    this.addColorInput(hierBgRow.controlEl, '', this.plugin.settings.hierarchyBgColor, (v) => {
      this.plugin.settings.hierarchyBgColor = v;
      this.plugin.scheduleSaveAndUpdate();
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

      // Created detached and appended later so listeners below can close over
      // it while it still renders after the color inputs.
      const preview = createSpan({ cls: 'hh-preview', text: combo.name || 'Preview' });
      if (combo.fontColor) preview.style.color = combo.fontColor;
      if (combo.bgColor) preview.style.backgroundColor = combo.bgColor;

      const nameInput = row.createEl('input', { cls: 'hh-input hh-name-input', placeholder: 'Name' });
      nameInput.type = 'text';
      nameInput.value = combo.name;
      nameInput.addEventListener('input', () => {
        combo.name = nameInput.value;
        preview.textContent = combo.name || 'Preview';
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addColorInput(row, 'Font', combo.fontColor, (v) => {
        combo.fontColor = v;
        preview.style.color = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addColorInput(row, 'BG', combo.bgColor, (v) => {
        combo.bgColor = v;
        preview.style.backgroundColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      row.appendChild(preview);

      this.addDeleteButton(row, 'Delete combination', async () => {
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
      nameInput.addEventListener('input', () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });

      const patternInput = row.createEl('input', { cls: 'hh-input hh-pattern-input', placeholder: 'Regex pattern' });
      patternInput.type = 'text';
      patternInput.value = rule.pattern;
      this.applyPatternValidation(patternInput, rule.pattern);
      patternInput.addEventListener('input', () => {
        rule.pattern = patternInput.value;
        this.applyPatternValidation(patternInput, rule.pattern);
        this.plugin.scheduleSaveAndUpdate();
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

      this.addColorInput(row, 'Font', rule.fontColor, (v) => {
        rule.fontColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addColorInput(row, 'BG', rule.bgColor, (v) => {
        rule.bgColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addTabToggle(row, rule);

      this.addDeleteButton(row, 'Delete rule', async () => {
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
      nameInput.addEventListener('input', () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });

      const keyInput = row.createEl('input', { cls: 'hh-input hh-key-input', placeholder: 'Key' });
      keyInput.type = 'text';
      keyInput.value = rule.key;
      keyInput.addEventListener('input', () => {
        rule.key = keyInput.value.trim();
        this.plugin.scheduleSaveAndUpdate();
      });

      const sep = row.createEl('span', { text: ':', cls: 'hh-yaml-sep' });
      sep.setAttribute('aria-hidden', 'true');

      const valueInput = row.createEl('input', { cls: 'hh-input hh-value-input', placeholder: 'Value' });
      valueInput.type = 'text';
      valueInput.value = rule.value;
      valueInput.addEventListener('input', () => {
        rule.value = valueInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addColorInput(row, 'Font', rule.fontColor, (v) => {
        rule.fontColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addColorInput(row, 'BG', rule.bgColor, (v) => {
        rule.bgColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addDeleteButton(row, 'Delete rule', async () => {
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
      nameInput.addEventListener('input', () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addDeleteButton(row1, 'Delete rule', async () => {
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
      folderInput.addEventListener('input', () => {
        rule.folderPattern = folderInput.value;
        this.applyPatternValidation(folderInput, rule.folderPattern);
        this.plugin.scheduleSaveAndUpdate();
      });

      const fileInput = row2.createEl('input', { cls: 'hh-input hh-pattern-input', placeholder: 'File name regex (capture group = number)' });
      fileInput.type = 'text';
      fileInput.value = rule.filePattern;
      this.applyPatternValidation(fileInput, rule.filePattern, true);
      fileInput.addEventListener('input', () => {
        rule.filePattern = fileInput.value;
        this.applyPatternValidation(fileInput, rule.filePattern, true);
        this.plugin.scheduleSaveAndUpdate();
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

      this.addColorInput(row2, 'Font', rule.fontColor, (v) => {
        rule.fontColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addColorInput(row2, 'BG', rule.bgColor, (v) => {
        rule.bgColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });

      this.addTabToggle(row2, rule);
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private addColorInput(
    parent: HTMLElement,
    label: string,
    value: string,
    onChange: (v: string) => void
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

  private addTabToggle(parent: HTMLElement, rule: RegexRule | ConditionalRule): void {
    const wrap = parent.createDiv('hh-color-wrap');
    wrap.createEl('span', { text: 'Tab', cls: 'hh-color-label' });
    const chk = wrap.createEl('input');
    chk.type = 'checkbox';
    chk.checked = !!rule.applyToTab;
    chk.classList.add('hh-color-toggle');
    chk.title = 'Apply formatting to open tab header';
    chk.addEventListener('change', async () => {
      rule.applyToTab = chk.checked;
      await this.plugin.saveSettings();
      this.plugin.updateStyles();
    });
  }

  private addDeleteButton(parent: HTMLElement, ariaLabel: string, onDelete: () => Promise<void>): void {
    const del = parent.createEl('button', { cls: 'hh-btn-delete' });
    del.textContent = '×';
    del.setAttribute('aria-label', ariaLabel);
    del.addEventListener('click', () => {
      onDelete().catch(console.error);
    });
  }

  private applyPatternValidation(input: HTMLInputElement, pattern: string, requireGroup = false) {
    if (!pattern) {
      input.classList.remove('hh-invalid');
      input.title = '';
      return;
    }
    try {
      new RegExp(pattern);
    } catch {
      input.classList.add('hh-invalid');
      input.title = 'Invalid regular expression';
      return;
    }
    // Appending "|" makes the regex match the empty string, so exec reveals
    // the capture-group count without needing a matching input.
    if (requireGroup) {
      const groups = (new RegExp(pattern + '|').exec('') as RegExpExecArray).length - 1;
      if (groups === 0) {
        input.classList.add('hh-invalid');
        input.title = 'Pattern needs a capture group around the number, e.g. Update(\\d+)';
        return;
      }
    }
    input.classList.remove('hh-invalid');
    input.title = '';
  }
}

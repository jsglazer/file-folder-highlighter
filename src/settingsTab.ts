import { App, PluginSettingTab, Setting } from 'obsidian';
import FileFolderHighlighterPlugin from './main';
import { ColorCombo, RegexRule, YamlRule, ConditionalRule, ThemedColors } from './settings';

function genId(): string {
	if (typeof window.crypto?.randomUUID === 'function') {
		return window.crypto.randomUUID();
	}
	return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function pickRandom<T>(arr: T[], n: number): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, n);
}

export class FileFolderHighlighterSettingTab extends PluginSettingTab {
	plugin: FileFolderHighlighterPlugin;

	constructor(app: App, plugin: FileFolderHighlighterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Color Combinations ────────────────────────────────────────────────────
		new Setting(containerEl).setName('Color combinations').setHeading();
		containerEl.createEl('p', {
			text: 'Named color combinations you can assign to files and folders via right-click. Leave font or background unset to keep the Obsidian default. Each color has separate light (☀) and dark (🌙) theme variants.',
			cls: 'setting-item-description',
		});

		const combosEl = containerEl.createDiv('hh-list');
		this.renderCombos(combosEl);

		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText('Add combination')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.colorCombos.push({
						id: genId(),
						name: 'New combination',
						fontColorLight: '#ffffff',
						bgColorLight: '#4a90d9',
						fontColorDark: '#ffffff',
						bgColorDark: '#4a90d9',
					});
					await this.plugin.saveSettings();
					this.renderCombos(combosEl);
					this.plugin.updateStyles();
				}),
		);

		// ── Hierarchy Highlighting ────────────────────────────────────────────────
		new Setting(containerEl).setName('Hierarchy highlighting').setHeading();

		new Setting(containerEl)
			.setName('Enable')
			.setDesc('Highlight all ancestor folders of the currently active file.')
			.addToggle((t) =>
				t.setValue(this.plugin.settings.hierarchyEnabled).onChange(async (v) => {
					this.plugin.settings.hierarchyEnabled = v;
					await this.plugin.saveSettings();
					this.plugin.updateStyles();
				}),
			);

		const hierFontRow = new Setting(containerEl)
			.setName('Font color')
			.setDesc('Leave unset to use the Obsidian default.');
		const hierFontPair = hierFontRow.controlEl.createDiv('hh-color-pair');
		this.addColorSwatch(hierFontPair, '☀', this.plugin.settings.hierarchyFontColorLight, (v) => {
			this.plugin.settings.hierarchyFontColorLight = v;
			this.plugin.scheduleSaveAndUpdate();
		});
		this.addColorSwatch(hierFontPair, '🌙', this.plugin.settings.hierarchyFontColorDark, (v) => {
			this.plugin.settings.hierarchyFontColorDark = v;
			this.plugin.scheduleSaveAndUpdate();
		});

		const hierBgRow = new Setting(containerEl)
			.setName('Background color')
			.setDesc('Leave unset to use the Obsidian default.');
		const hierBgPair = hierBgRow.controlEl.createDiv('hh-color-pair');
		this.addColorSwatch(hierBgPair, '☀', this.plugin.settings.hierarchyBgColorLight, (v) => {
			this.plugin.settings.hierarchyBgColorLight = v;
			this.plugin.scheduleSaveAndUpdate();
		});
		this.addColorSwatch(hierBgPair, '🌙', this.plugin.settings.hierarchyBgColorDark, (v) => {
			this.plugin.settings.hierarchyBgColorDark = v;
			this.plugin.scheduleSaveAndUpdate();
		});

		// ── Regex Rules ───────────────────────────────────────────────────────────
		new Setting(containerEl).setName('Regex highlighting rules').setHeading();
		containerEl.createEl('p', {
			text: 'Apply colors to files or folders whose names match a regular expression.',
			cls: 'setting-item-description',
		});

		const rulesEl = containerEl.createDiv('hh-list');
		this.renderRules(rulesEl);

		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText('Add rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.regexRules.push({
						id: genId(),
						name: 'New rule',
						pattern: '',
						fontColorLight: '#ffffff',
						bgColorLight: '#e74c3c',
						fontColorDark: '#ffffff',
						bgColorDark: '#e74c3c',
						appliesTo: 'both',
					});
					await this.plugin.saveSettings();
					this.renderRules(rulesEl);
				}),
		);

		// ── YAML Rules ───────────────────────────────────────────────────────────
		new Setting(containerEl).setName('YAML frontmatter rules').setHeading();
		containerEl.createEl('p', {
			text: 'Apply colors to files whose frontmatter contains a specific key/value pair (e.g. Status: Refine). Files only — folders have no frontmatter.',
			cls: 'setting-item-description',
		});

		const yamlRulesEl = containerEl.createDiv('hh-list');
		this.renderYamlRules(yamlRulesEl);

		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText('Add YAML rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.yamlRules.push({
						id: genId(),
						name: 'New rule',
						key: '',
						value: '',
						fontColorLight: '#ffffff',
						bgColorLight: '#27ae60',
						fontColorDark: '#ffffff',
						bgColorDark: '#27ae60',
					});
					await this.plugin.saveSettings();
					this.renderYamlRules(yamlRulesEl);
				}),
		);

		// ── Conditional Rules ─────────────────────────────────────────────────────
		new Setting(containerEl).setName('Conditional highlighting rules').setHeading();
		containerEl.createEl('p', {
			text: 'Highlight the file with the highest or lowest numeric value in folders matching a name pattern.',
			cls: 'setting-item-description',
		});
		containerEl.createEl('p', {
			text: 'Example: folder pattern "^updates$", file pattern "update(\\d+)" with condition max highlights the latest update file in every updates folder.',
			cls: 'setting-item-description',
		});

		const condRulesEl = containerEl.createDiv('hh-list');
		this.renderConditionalRules(condRulesEl);

		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText('Add conditional rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.conditionalRules.push({
						id: genId(),
						name: 'New rule',
						fontColorLight: '#ffffff',
						bgColorLight: '#9b59b6',
						fontColorDark: '#ffffff',
						bgColorDark: '#9b59b6',
						folderPattern: '',
						filePattern: '',
						condition: 'max',
					});
					await this.plugin.saveSettings();
					this.renderConditionalRules(condRulesEl);
				}),
		);
	}

	// ── Combo list ──────────────────────────────────────────────────────────────

	private renderCombos(container: HTMLElement) {
		container.empty();

		if (this.plugin.settings.colorCombos.length === 0) {
			container.createEl('p', {
				text: 'No combinations defined.',
				cls: 'setting-item-description hh-empty',
			});
			return;
		}

		this.plugin.settings.colorCombos.forEach((combo: ColorCombo, i: number) => {
			const row = container.createDiv('hh-row');

			// Created detached and appended later so listeners below can close over
			// it while it still renders after the color inputs.
			const previewLight = createSpan({ cls: 'hh-preview', text: combo.name || 'Light' });
			previewLight.setCssStyles({
				color: combo.fontColorLight || '',
				backgroundColor: combo.bgColorLight || '',
			});
			const previewDark = createSpan({ cls: 'hh-preview', text: combo.name || 'Dark' });
			previewDark.setCssStyles({
				color: combo.fontColorDark || '',
				backgroundColor: combo.bgColorDark || '',
			});

			const nameInput = row.createEl('input', {
				cls: 'hh-input hh-name-input',
				placeholder: 'Name',
			});
			nameInput.type = 'text';
			nameInput.value = combo.name;
			nameInput.addEventListener('input', () => {
				combo.name = nameInput.value;
				previewLight.textContent = combo.name || 'Light';
				previewDark.textContent = combo.name || 'Dark';
				this.plugin.scheduleSaveAndUpdate();
			});

			this.addThemedColorInput(
				row,
				'Font',
				combo,
				'font',
				(v) => {
					combo.fontColorLight = v;
					previewLight.setCssStyles({ color: v });
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					combo.fontColorDark = v;
					previewDark.setCssStyles({ color: v });
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addThemedColorInput(
				row,
				'BG',
				combo,
				'bg',
				(v) => {
					combo.bgColorLight = v;
					previewLight.setCssStyles({ backgroundColor: v });
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					combo.bgColorDark = v;
					previewDark.setCssStyles({ backgroundColor: v });
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addTabToggle(row, combo);

			row.appendChild(previewLight);
			row.appendChild(previewDark);

			this.addDeleteButton(row, 'Delete combination', async () => {
				this.plugin.settings.colorCombos.splice(i, 1);
				this.plugin.settings.fileColors = this.plugin.settings.fileColors.filter(
					(e) => e.comboId !== combo.id,
				);
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
			container.createEl('p', {
				text: 'No rules defined.',
				cls: 'setting-item-description hh-empty',
			});
			return;
		}

		this.plugin.settings.regexRules.forEach((rule: RegexRule, i: number) => {
			const group = container.createDiv('hh-rule-group');
			const row = group.createDiv('hh-row');

			const nameInput = row.createEl('input', {
				cls: 'hh-input hh-name-input',
				placeholder: 'Rule name',
			});
			nameInput.type = 'text';
			nameInput.value = rule.name;
			nameInput.addEventListener('input', () => {
				rule.name = nameInput.value;
				this.plugin.scheduleSaveAndUpdate();
			});

			const examplesEl = group.createDiv('hh-examples');
			const refreshExamples = () => this.renderRegexExamples(examplesEl, rule);
			refreshExamples();

			const patternInput = row.createEl('input', {
				cls: 'hh-input hh-pattern-input',
				placeholder: 'Regex pattern',
			});
			patternInput.type = 'text';
			patternInput.value = rule.pattern;
			this.applyPatternValidation(patternInput, rule.pattern);
			patternInput.addEventListener('input', () => {
				rule.pattern = patternInput.value;
				this.applyPatternValidation(patternInput, rule.pattern);
				this.plugin.scheduleSaveAndUpdate();
				refreshExamples();
			});

			const select = row.createEl('select', { cls: 'hh-select' });
			for (const [val, label] of [
				['files', 'Files'],
				['folders', 'Folders'],
				['both', 'Files & Folders'],
			] as [string, string][]) {
				const opt = select.createEl('option');
				opt.value = val;
				opt.textContent = label;
			}
			select.value = rule.appliesTo;
			select.addEventListener('change', () => {
				rule.appliesTo = select.value as 'files' | 'folders' | 'both';
				this.persist();
				refreshExamples();
			});

			this.addThemedColorInput(
				row,
				'Font',
				rule,
				'font',
				(v) => {
					rule.fontColorLight = v;
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					rule.fontColorDark = v;
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addThemedColorInput(
				row,
				'BG',
				rule,
				'bg',
				(v) => {
					rule.bgColorLight = v;
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					rule.bgColorDark = v;
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addTabToggle(row, rule);

			this.addDeleteButton(row, 'Delete rule', async () => {
				this.plugin.settings.regexRules.splice(i, 1);
				await this.plugin.saveSettings();
				this.renderRules(container);
				this.plugin.updateStyles();
			});
		});
	}

	/** Shows up to 3 random vault paths currently matching a regex rule, below its name. */
	private renderRegexExamples(container: HTMLElement, rule: RegexRule): void {
		container.empty();
		if (!rule.pattern) return;

		let regex: RegExp;
		try {
			regex = new RegExp(rule.pattern);
		} catch {
			return;
		}

		const candidates: string[] = [];
		if (rule.appliesTo !== 'folders') {
			for (const file of this.app.vault.getFiles()) {
				if (regex.test(file.basename)) candidates.push(file.path);
			}
		}
		if (rule.appliesTo !== 'files') {
			for (const folder of this.plugin.getAllFolders()) {
				if (regex.test(folder.name)) candidates.push(folder.path + '/');
			}
		}
		if (candidates.length === 0) return;

		const sample = pickRandom(candidates, 3);
		container.createEl('p', {
			text: `Matches: ${sample.join(', ')}`,
			cls: 'setting-item-description hh-empty',
		});
	}

	// ── YAML rule list ───────────────────────────────────────────────────────────

	private renderYamlRules(container: HTMLElement) {
		container.empty();

		if (this.plugin.settings.yamlRules.length === 0) {
			container.createEl('p', {
				text: 'No YAML rules defined.',
				cls: 'setting-item-description hh-empty',
			});
			return;
		}

		this.plugin.settings.yamlRules.forEach((rule: YamlRule, i: number) => {
			const row = container.createDiv('hh-row');

			const nameInput = row.createEl('input', {
				cls: 'hh-input hh-name-input',
				placeholder: 'Rule name',
			});
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

			const valueInput = row.createEl('input', {
				cls: 'hh-input hh-value-input',
				placeholder: 'Value',
			});
			valueInput.type = 'text';
			valueInput.value = rule.value;
			valueInput.addEventListener('input', () => {
				rule.value = valueInput.value;
				this.plugin.scheduleSaveAndUpdate();
			});

			this.addThemedColorInput(
				row,
				'Font',
				rule,
				'font',
				(v) => {
					rule.fontColorLight = v;
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					rule.fontColorDark = v;
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addThemedColorInput(
				row,
				'BG',
				rule,
				'bg',
				(v) => {
					rule.bgColorLight = v;
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					rule.bgColorDark = v;
					this.plugin.scheduleSaveAndUpdate();
				},
			);

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
			container.createEl('p', {
				text: 'No conditional rules defined.',
				cls: 'setting-item-description hh-empty',
			});
			return;
		}

		this.plugin.settings.conditionalRules.forEach((rule: ConditionalRule, i: number) => {
			const group = container.createDiv('hh-cond-group');

			// Row 1: name + delete
			const row1 = group.createDiv('hh-row hh-cond-header');

			const nameInput = row1.createEl('input', {
				cls: 'hh-input hh-name-input',
				placeholder: 'Rule name',
			});
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

			const folderInput = row2.createEl('input', {
				cls: 'hh-input hh-pattern-input',
				placeholder: 'Folder name regex',
			});
			folderInput.type = 'text';
			folderInput.value = rule.folderPattern;
			this.applyPatternValidation(folderInput, rule.folderPattern);
			folderInput.addEventListener('input', () => {
				rule.folderPattern = folderInput.value;
				this.applyPatternValidation(folderInput, rule.folderPattern);
				this.plugin.scheduleSaveAndUpdate();
			});

			const fileInput = row2.createEl('input', {
				cls: 'hh-input hh-pattern-input',
				placeholder: 'File name regex (capture group = number)',
			});
			fileInput.type = 'text';
			fileInput.value = rule.filePattern;
			this.applyPatternValidation(fileInput, rule.filePattern, true);
			fileInput.addEventListener('input', () => {
				rule.filePattern = fileInput.value;
				this.applyPatternValidation(fileInput, rule.filePattern, true);
				this.plugin.scheduleSaveAndUpdate();
			});

			const condSelect = row2.createEl('select', { cls: 'hh-select hh-cond-select' });
			for (const [val, label] of [
				['max', 'Max'],
				['min', 'Min'],
			] as [string, string][]) {
				const opt = condSelect.createEl('option');
				opt.value = val;
				opt.textContent = label;
			}
			condSelect.value = rule.condition;
			condSelect.addEventListener('change', () => {
				rule.condition = condSelect.value as 'max' | 'min';
				this.persist();
			});

			this.addThemedColorInput(
				row2,
				'Font',
				rule,
				'font',
				(v) => {
					rule.fontColorLight = v;
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					rule.fontColorDark = v;
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addThemedColorInput(
				row2,
				'BG',
				rule,
				'bg',
				(v) => {
					rule.bgColorLight = v;
					this.plugin.scheduleSaveAndUpdate();
				},
				(v) => {
					rule.bgColorDark = v;
					this.plugin.scheduleSaveAndUpdate();
				},
			);

			this.addTabToggle(row2, rule);
		});
	}

	// ── Helpers ─────────────────────────────────────────────────────────────────

	/** Immediate save + refresh for discrete changes (selects, checkboxes). */
	private persist(): void {
		this.plugin.updateStyles();
		this.plugin.saveSettings().catch((e) => console.error(e));
	}

	/** Renders a Font/BG label with a Light (☀) + Dark (🌙) color swatch pair beneath it. */
	private addThemedColorInput(
		parent: HTMLElement,
		label: string,
		entry: ThemedColors,
		prefix: 'font' | 'bg',
		onLightChange: (v: string) => void,
		onDarkChange: (v: string) => void,
	): void {
		const wrap = parent.createDiv('hh-color-wrap');
		if (label) wrap.createEl('span', { text: label, cls: 'hh-color-label' });

		const pair = wrap.createDiv('hh-color-pair');
		const lightKey = prefix === 'font' ? 'fontColorLight' : 'bgColorLight';
		const darkKey = prefix === 'font' ? 'fontColorDark' : 'bgColorDark';
		this.addColorSwatch(pair, '☀', entry[lightKey], onLightChange);
		this.addColorSwatch(pair, '🌙', entry[darkKey], onDarkChange);
	}

	private addColorSwatch(
		parent: HTMLElement,
		subLabel: string,
		value: string,
		onChange: (v: string) => void,
	): void {
		const slot = parent.createDiv('hh-color-slot');
		slot.createEl('span', { text: subLabel, cls: 'hh-color-sublabel' });

		const isSet = value !== '';

		const checkbox = slot.createEl('input');
		checkbox.type = 'checkbox';
		checkbox.checked = isSet;
		checkbox.classList.add('hh-color-toggle');
		checkbox.title = 'Use custom color';

		const input = slot.createEl('input', { cls: 'hh-color-input' });
		input.type = 'color';
		input.value = isSet ? value : '#ffffff';
		input.toggleClass('hh-hidden', !isSet);

		checkbox.addEventListener('change', () => {
			input.toggleClass('hh-hidden', !checkbox.checked);
			onChange(checkbox.checked ? input.value : '');
		});

		input.addEventListener('input', () => {
			if (checkbox.checked) onChange(input.value);
		});
	}

	private addTabToggle(parent: HTMLElement, rule: RegexRule | ConditionalRule | ColorCombo): void {
		const wrap = parent.createDiv('hh-color-wrap');
		wrap.createEl('span', { text: 'Tab', cls: 'hh-color-label' });
		const chk = wrap.createEl('input');
		chk.type = 'checkbox';
		chk.checked = !!rule.applyToTab;
		chk.classList.add('hh-color-toggle');
		chk.title = 'Apply formatting to open tab header';
		chk.addEventListener('change', () => {
			rule.applyToTab = chk.checked;
			this.persist();
		});
	}

	private addDeleteButton(
		parent: HTMLElement,
		ariaLabel: string,
		onDelete: () => Promise<void>,
	): void {
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

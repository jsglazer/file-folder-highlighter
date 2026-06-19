"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FileFolderHighlighterPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/settings.ts
var DEFAULT_SETTINGS = {
  colorCombos: [],
  fileColors: [],
  hierarchyEnabled: false,
  hierarchyFontColorLight: "#ffffff",
  hierarchyBgColorLight: "#2c7be5",
  hierarchyFontColorDark: "#ffffff",
  hierarchyBgColorDark: "#2c7be5",
  regexRules: [],
  yamlRules: [],
  conditionalRules: []
};
function migrateThemedColors(entry) {
  const out = { ...entry };
  const legacyFont = out["fontColor"];
  if (typeof legacyFont === "string") {
    if (out["fontColorLight"] === void 0) out["fontColorLight"] = legacyFont;
    if (out["fontColorDark"] === void 0) out["fontColorDark"] = legacyFont;
    delete out["fontColor"];
  }
  const legacyBg = out["bgColor"];
  if (typeof legacyBg === "string") {
    if (out["bgColorLight"] === void 0) out["bgColorLight"] = legacyBg;
    if (out["bgColorDark"] === void 0) out["bgColorDark"] = legacyBg;
    delete out["bgColor"];
  }
  return out;
}
function migrateSettings(raw) {
  const data = { ...raw };
  for (const key of ["colorCombos", "regexRules", "yamlRules", "conditionalRules"]) {
    const arr = data[key];
    if (Array.isArray(arr)) {
      data[key] = arr.map((entry) => migrateThemedColors(entry));
    }
  }
  const legacyHierarchyFont = data["hierarchyFontColor"];
  if (typeof legacyHierarchyFont === "string") {
    if (data["hierarchyFontColorLight"] === void 0)
      data["hierarchyFontColorLight"] = legacyHierarchyFont;
    if (data["hierarchyFontColorDark"] === void 0)
      data["hierarchyFontColorDark"] = legacyHierarchyFont;
    delete data["hierarchyFontColor"];
  }
  const legacyHierarchyBg = data["hierarchyBgColor"];
  if (typeof legacyHierarchyBg === "string") {
    if (data["hierarchyBgColorLight"] === void 0)
      data["hierarchyBgColorLight"] = legacyHierarchyBg;
    if (data["hierarchyBgColorDark"] === void 0)
      data["hierarchyBgColorDark"] = legacyHierarchyBg;
    delete data["hierarchyBgColor"];
  }
  return Object.assign({}, DEFAULT_SETTINGS, data);
}

// src/settingsTab.ts
var import_obsidian = require("obsidian");
function genId() {
  var _a;
  if (typeof ((_a = window.crypto) == null ? void 0 : _a.randomUUID) === "function") {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
var FileFolderHighlighterSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Color combinations").setHeading();
    containerEl.createEl("p", {
      text: "Named color combinations you can assign to files and folders via right-click. Leave font or background unset to keep the Obsidian default. Each color has separate light (\u2600) and dark (\u{1F319}) theme variants.",
      cls: "setting-item-description"
    });
    const combosEl = containerEl.createDiv("hh-list");
    this.renderCombos(combosEl);
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("Add combination").setCta().onClick(async () => {
        this.plugin.settings.colorCombos.push({
          id: genId(),
          name: "New combination",
          fontColorLight: "#ffffff",
          bgColorLight: "#4a90d9",
          fontColorDark: "#ffffff",
          bgColorDark: "#4a90d9"
        });
        await this.plugin.saveSettings();
        this.renderCombos(combosEl);
        this.plugin.updateStyles();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Hierarchy highlighting").setHeading();
    new import_obsidian.Setting(containerEl).setName("Enable").setDesc("Highlight all ancestor folders of the currently active file.").addToggle(
      (t) => t.setValue(this.plugin.settings.hierarchyEnabled).onChange(async (v) => {
        this.plugin.settings.hierarchyEnabled = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      })
    );
    const hierFontRow = new import_obsidian.Setting(containerEl).setName("Font color").setDesc("Leave unset to use the Obsidian default.");
    const hierFontPair = hierFontRow.controlEl.createDiv("hh-color-pair");
    this.addColorSwatch(hierFontPair, "\u2600", this.plugin.settings.hierarchyFontColorLight, (v) => {
      this.plugin.settings.hierarchyFontColorLight = v;
      this.plugin.scheduleSaveAndUpdate();
    });
    this.addColorSwatch(hierFontPair, "\u{1F319}", this.plugin.settings.hierarchyFontColorDark, (v) => {
      this.plugin.settings.hierarchyFontColorDark = v;
      this.plugin.scheduleSaveAndUpdate();
    });
    const hierBgRow = new import_obsidian.Setting(containerEl).setName("Background color").setDesc("Leave unset to use the Obsidian default.");
    const hierBgPair = hierBgRow.controlEl.createDiv("hh-color-pair");
    this.addColorSwatch(hierBgPair, "\u2600", this.plugin.settings.hierarchyBgColorLight, (v) => {
      this.plugin.settings.hierarchyBgColorLight = v;
      this.plugin.scheduleSaveAndUpdate();
    });
    this.addColorSwatch(hierBgPair, "\u{1F319}", this.plugin.settings.hierarchyBgColorDark, (v) => {
      this.plugin.settings.hierarchyBgColorDark = v;
      this.plugin.scheduleSaveAndUpdate();
    });
    new import_obsidian.Setting(containerEl).setName("Regex highlighting rules").setHeading();
    containerEl.createEl("p", {
      text: "Apply colors to files or folders whose names match a regular expression.",
      cls: "setting-item-description"
    });
    const rulesEl = containerEl.createDiv("hh-list");
    this.renderRules(rulesEl);
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("Add rule").setCta().onClick(async () => {
        this.plugin.settings.regexRules.push({
          id: genId(),
          name: "New rule",
          pattern: "",
          fontColorLight: "#ffffff",
          bgColorLight: "#e74c3c",
          fontColorDark: "#ffffff",
          bgColorDark: "#e74c3c",
          appliesTo: "both"
        });
        await this.plugin.saveSettings();
        this.renderRules(rulesEl);
      })
    );
    new import_obsidian.Setting(containerEl).setName("YAML frontmatter rules").setHeading();
    containerEl.createEl("p", {
      text: "Apply colors to files whose frontmatter contains a specific key/value pair (e.g. Status: Refine). Files only \u2014 folders have no frontmatter.",
      cls: "setting-item-description"
    });
    const yamlRulesEl = containerEl.createDiv("hh-list");
    this.renderYamlRules(yamlRulesEl);
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("Add YAML rule").setCta().onClick(async () => {
        this.plugin.settings.yamlRules.push({
          id: genId(),
          name: "New rule",
          key: "",
          value: "",
          fontColorLight: "#ffffff",
          bgColorLight: "#27ae60",
          fontColorDark: "#ffffff",
          bgColorDark: "#27ae60"
        });
        await this.plugin.saveSettings();
        this.renderYamlRules(yamlRulesEl);
      })
    );
    new import_obsidian.Setting(containerEl).setName("Conditional highlighting rules").setHeading();
    containerEl.createEl("p", {
      text: "Highlight the file with the highest or lowest numeric value in folders matching a name pattern.",
      cls: "setting-item-description"
    });
    containerEl.createEl("p", {
      text: 'Example: folder pattern "^updates$", file pattern "update(\\d+)" with condition max highlights the latest update file in every updates folder.',
      cls: "setting-item-description"
    });
    const condRulesEl = containerEl.createDiv("hh-list");
    this.renderConditionalRules(condRulesEl);
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("Add conditional rule").setCta().onClick(async () => {
        this.plugin.settings.conditionalRules.push({
          id: genId(),
          name: "New rule",
          fontColorLight: "#ffffff",
          bgColorLight: "#9b59b6",
          fontColorDark: "#ffffff",
          bgColorDark: "#9b59b6",
          folderPattern: "",
          filePattern: "",
          condition: "max"
        });
        await this.plugin.saveSettings();
        this.renderConditionalRules(condRulesEl);
      })
    );
  }
  // ── Combo list ──────────────────────────────────────────────────────────────
  renderCombos(container) {
    container.empty();
    if (this.plugin.settings.colorCombos.length === 0) {
      container.createEl("p", {
        text: "No combinations defined.",
        cls: "setting-item-description hh-empty"
      });
      return;
    }
    this.plugin.settings.colorCombos.forEach((combo, i) => {
      const row = container.createDiv("hh-row");
      const previewLight = createSpan({ cls: "hh-preview", text: combo.name || "Light" });
      previewLight.setCssStyles({
        color: combo.fontColorLight || "",
        backgroundColor: combo.bgColorLight || ""
      });
      const previewDark = createSpan({ cls: "hh-preview", text: combo.name || "Dark" });
      previewDark.setCssStyles({
        color: combo.fontColorDark || "",
        backgroundColor: combo.bgColorDark || ""
      });
      const nameInput = row.createEl("input", {
        cls: "hh-input hh-name-input",
        placeholder: "Name"
      });
      nameInput.type = "text";
      nameInput.value = combo.name;
      nameInput.addEventListener("input", () => {
        combo.name = nameInput.value;
        previewLight.textContent = combo.name || "Light";
        previewDark.textContent = combo.name || "Dark";
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addThemedColorInput(
        row,
        "Font",
        combo,
        "font",
        (v) => {
          combo.fontColorLight = v;
          previewLight.setCssStyles({ color: v });
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          combo.fontColorDark = v;
          previewDark.setCssStyles({ color: v });
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addThemedColorInput(
        row,
        "BG",
        combo,
        "bg",
        (v) => {
          combo.bgColorLight = v;
          previewLight.setCssStyles({ backgroundColor: v });
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          combo.bgColorDark = v;
          previewDark.setCssStyles({ backgroundColor: v });
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addTabToggle(row, combo);
      row.appendChild(previewLight);
      row.appendChild(previewDark);
      this.addDeleteButton(row, "Delete combination", async () => {
        this.plugin.settings.colorCombos.splice(i, 1);
        this.plugin.settings.fileColors = this.plugin.settings.fileColors.filter(
          (e) => e.comboId !== combo.id
        );
        await this.plugin.saveSettings();
        this.renderCombos(container);
        this.plugin.updateStyles();
      });
    });
  }
  // ── Regex rule list ─────────────────────────────────────────────────────────
  renderRules(container) {
    container.empty();
    if (this.plugin.settings.regexRules.length === 0) {
      container.createEl("p", {
        text: "No rules defined.",
        cls: "setting-item-description hh-empty"
      });
      return;
    }
    this.plugin.settings.regexRules.forEach((rule, i) => {
      const group = container.createDiv("hh-rule-group");
      const row = group.createDiv("hh-row");
      const nameInput = row.createEl("input", {
        cls: "hh-input hh-name-input",
        placeholder: "Rule name"
      });
      nameInput.type = "text";
      nameInput.value = rule.name;
      nameInput.addEventListener("input", () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });
      const examplesEl = group.createDiv("hh-examples");
      const refreshExamples = () => this.renderRegexExamples(examplesEl, rule);
      refreshExamples();
      const patternInput = row.createEl("input", {
        cls: "hh-input hh-pattern-input",
        placeholder: "Regex pattern"
      });
      patternInput.type = "text";
      patternInput.value = rule.pattern;
      this.applyPatternValidation(patternInput, rule.pattern);
      patternInput.addEventListener("input", () => {
        rule.pattern = patternInput.value;
        this.applyPatternValidation(patternInput, rule.pattern);
        this.plugin.scheduleSaveAndUpdate();
        refreshExamples();
      });
      const select = row.createEl("select", { cls: "hh-select" });
      for (const [val, label] of [
        ["files", "Files"],
        ["folders", "Folders"],
        ["both", "Files & Folders"]
      ]) {
        const opt = select.createEl("option");
        opt.value = val;
        opt.textContent = label;
      }
      select.value = rule.appliesTo;
      select.addEventListener("change", () => {
        rule.appliesTo = select.value;
        this.persist();
        refreshExamples();
      });
      this.addThemedColorInput(
        row,
        "Font",
        rule,
        "font",
        (v) => {
          rule.fontColorLight = v;
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          rule.fontColorDark = v;
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addThemedColorInput(
        row,
        "BG",
        rule,
        "bg",
        (v) => {
          rule.bgColorLight = v;
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          rule.bgColorDark = v;
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addTabToggle(row, rule);
      this.addDeleteButton(row, "Delete rule", async () => {
        this.plugin.settings.regexRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderRules(container);
        this.plugin.updateStyles();
      });
    });
  }
  /** Shows up to 3 random vault paths currently matching a regex rule, below its name. */
  renderRegexExamples(container, rule) {
    container.empty();
    if (!rule.pattern) return;
    let regex;
    try {
      regex = new RegExp(rule.pattern);
    } catch (e) {
      return;
    }
    const candidates = [];
    if (rule.appliesTo !== "folders") {
      for (const file of this.app.vault.getFiles()) {
        if (regex.test(file.basename)) candidates.push(file.path);
      }
    }
    if (rule.appliesTo !== "files") {
      for (const folder of this.plugin.getAllFolders()) {
        if (regex.test(folder.name)) candidates.push(folder.path + "/");
      }
    }
    if (candidates.length === 0) return;
    const sample = pickRandom(candidates, 3);
    container.createEl("p", {
      text: `Matches: ${sample.join(", ")}`,
      cls: "setting-item-description hh-empty"
    });
  }
  // ── YAML rule list ───────────────────────────────────────────────────────────
  renderYamlRules(container) {
    container.empty();
    if (this.plugin.settings.yamlRules.length === 0) {
      container.createEl("p", {
        text: "No YAML rules defined.",
        cls: "setting-item-description hh-empty"
      });
      return;
    }
    this.plugin.settings.yamlRules.forEach((rule, i) => {
      const row = container.createDiv("hh-row");
      const nameInput = row.createEl("input", {
        cls: "hh-input hh-name-input",
        placeholder: "Rule name"
      });
      nameInput.type = "text";
      nameInput.value = rule.name;
      nameInput.addEventListener("input", () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });
      const keyInput = row.createEl("input", { cls: "hh-input hh-key-input", placeholder: "Key" });
      keyInput.type = "text";
      keyInput.value = rule.key;
      keyInput.addEventListener("input", () => {
        rule.key = keyInput.value.trim();
        this.plugin.scheduleSaveAndUpdate();
      });
      const sep = row.createEl("span", { text: ":", cls: "hh-yaml-sep" });
      sep.setAttribute("aria-hidden", "true");
      const valueInput = row.createEl("input", {
        cls: "hh-input hh-value-input",
        placeholder: "Value"
      });
      valueInput.type = "text";
      valueInput.value = rule.value;
      valueInput.addEventListener("input", () => {
        rule.value = valueInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addThemedColorInput(
        row,
        "Font",
        rule,
        "font",
        (v) => {
          rule.fontColorLight = v;
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          rule.fontColorDark = v;
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addThemedColorInput(
        row,
        "BG",
        rule,
        "bg",
        (v) => {
          rule.bgColorLight = v;
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          rule.bgColorDark = v;
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addDeleteButton(row, "Delete rule", async () => {
        this.plugin.settings.yamlRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderYamlRules(container);
        this.plugin.updateStyles();
      });
    });
  }
  // ── Conditional rule list ────────────────────────────────────────────────────
  renderConditionalRules(container) {
    container.empty();
    if (this.plugin.settings.conditionalRules.length === 0) {
      container.createEl("p", {
        text: "No conditional rules defined.",
        cls: "setting-item-description hh-empty"
      });
      return;
    }
    this.plugin.settings.conditionalRules.forEach((rule, i) => {
      const group = container.createDiv("hh-cond-group");
      const row1 = group.createDiv("hh-row hh-cond-header");
      const nameInput = row1.createEl("input", {
        cls: "hh-input hh-name-input",
        placeholder: "Rule name"
      });
      nameInput.type = "text";
      nameInput.value = rule.name;
      nameInput.addEventListener("input", () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addDeleteButton(row1, "Delete rule", async () => {
        this.plugin.settings.conditionalRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderConditionalRules(container);
        this.plugin.updateStyles();
      });
      const row2 = group.createDiv("hh-row");
      const folderInput = row2.createEl("input", {
        cls: "hh-input hh-pattern-input",
        placeholder: "Folder name regex"
      });
      folderInput.type = "text";
      folderInput.value = rule.folderPattern;
      this.applyPatternValidation(folderInput, rule.folderPattern);
      folderInput.addEventListener("input", () => {
        rule.folderPattern = folderInput.value;
        this.applyPatternValidation(folderInput, rule.folderPattern);
        this.plugin.scheduleSaveAndUpdate();
      });
      const fileInput = row2.createEl("input", {
        cls: "hh-input hh-pattern-input",
        placeholder: "File name regex (capture group = number)"
      });
      fileInput.type = "text";
      fileInput.value = rule.filePattern;
      this.applyPatternValidation(fileInput, rule.filePattern, true);
      fileInput.addEventListener("input", () => {
        rule.filePattern = fileInput.value;
        this.applyPatternValidation(fileInput, rule.filePattern, true);
        this.plugin.scheduleSaveAndUpdate();
      });
      const condSelect = row2.createEl("select", { cls: "hh-select hh-cond-select" });
      for (const [val, label] of [
        ["max", "Max"],
        ["min", "Min"]
      ]) {
        const opt = condSelect.createEl("option");
        opt.value = val;
        opt.textContent = label;
      }
      condSelect.value = rule.condition;
      condSelect.addEventListener("change", () => {
        rule.condition = condSelect.value;
        this.persist();
      });
      this.addThemedColorInput(
        row2,
        "Font",
        rule,
        "font",
        (v) => {
          rule.fontColorLight = v;
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          rule.fontColorDark = v;
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addThemedColorInput(
        row2,
        "BG",
        rule,
        "bg",
        (v) => {
          rule.bgColorLight = v;
          this.plugin.scheduleSaveAndUpdate();
        },
        (v) => {
          rule.bgColorDark = v;
          this.plugin.scheduleSaveAndUpdate();
        }
      );
      this.addTabToggle(row2, rule);
    });
  }
  // ── Helpers ─────────────────────────────────────────────────────────────────
  /** Immediate save + refresh for discrete changes (selects, checkboxes). */
  persist() {
    this.plugin.updateStyles();
    this.plugin.saveSettings().catch((e) => console.error(e));
  }
  /** Renders a Font/BG label with a Light (☀) + Dark (🌙) color swatch pair beneath it. */
  addThemedColorInput(parent, label, entry, prefix, onLightChange, onDarkChange) {
    const wrap = parent.createDiv("hh-color-wrap");
    if (label) wrap.createEl("span", { text: label, cls: "hh-color-label" });
    const pair = wrap.createDiv("hh-color-pair");
    const lightKey = prefix === "font" ? "fontColorLight" : "bgColorLight";
    const darkKey = prefix === "font" ? "fontColorDark" : "bgColorDark";
    this.addColorSwatch(pair, "\u2600", entry[lightKey], onLightChange);
    this.addColorSwatch(pair, "\u{1F319}", entry[darkKey], onDarkChange);
  }
  addColorSwatch(parent, subLabel, value, onChange) {
    const slot = parent.createDiv("hh-color-slot");
    slot.createEl("span", { text: subLabel, cls: "hh-color-sublabel" });
    const isSet = value !== "";
    const checkbox = slot.createEl("input");
    checkbox.type = "checkbox";
    checkbox.checked = isSet;
    checkbox.classList.add("hh-color-toggle");
    checkbox.title = "Use custom color";
    const input = slot.createEl("input", { cls: "hh-color-input" });
    input.type = "color";
    input.value = isSet ? value : "#ffffff";
    input.toggleClass("hh-hidden", !isSet);
    checkbox.addEventListener("change", () => {
      input.toggleClass("hh-hidden", !checkbox.checked);
      onChange(checkbox.checked ? input.value : "");
    });
    input.addEventListener("input", () => {
      if (checkbox.checked) onChange(input.value);
    });
  }
  addTabToggle(parent, rule) {
    const wrap = parent.createDiv("hh-color-wrap");
    wrap.createEl("span", { text: "Tab", cls: "hh-color-label" });
    const chk = wrap.createEl("input");
    chk.type = "checkbox";
    chk.checked = !!rule.applyToTab;
    chk.classList.add("hh-color-toggle");
    chk.title = "Apply formatting to open tab header";
    chk.addEventListener("change", () => {
      rule.applyToTab = chk.checked;
      this.persist();
    });
  }
  addDeleteButton(parent, ariaLabel, onDelete) {
    const del = parent.createEl("button", { cls: "hh-btn-delete" });
    del.textContent = "\xD7";
    del.setAttribute("aria-label", ariaLabel);
    del.addEventListener("click", () => {
      onDelete().catch(console.error);
    });
  }
  applyPatternValidation(input, pattern, requireGroup = false) {
    if (!pattern) {
      input.classList.remove("hh-invalid");
      input.title = "";
      return;
    }
    try {
      new RegExp(pattern);
    } catch (e) {
      input.classList.add("hh-invalid");
      input.title = "Invalid regular expression";
      return;
    }
    if (requireGroup) {
      const groups = new RegExp(pattern + "|").exec("").length - 1;
      if (groups === 0) {
        input.classList.add("hh-invalid");
        input.title = "Pattern needs a capture group around the number, e.g. Update(\\d+)";
        return;
      }
    }
    input.classList.remove("hh-invalid");
    input.title = "";
  }
};

// src/main.ts
var SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$/;
var FileFolderHighlighterPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.currentHierarchyPaths = /* @__PURE__ */ new Set();
    // Path → style maps computed by updateStyles(); applyStyles() reads them so
    // re-applying after a DOM rebuild never has to re-evaluate the rules.
    this.navFileStyles = /* @__PURE__ */ new Map();
    this.navFolderStyles = /* @__PURE__ */ new Map();
    this.tabStyleMap = /* @__PURE__ */ new Map();
    // Elements we've applied inline styles to, tracked so teardown is exact and
    // works across popout windows without scanning any document.
    this.styledEls = /* @__PURE__ */ new Set();
    this.explorerObserver = null;
    this.observedContainers = /* @__PURE__ */ new Set();
    this.debouncedUpdate = (0, import_obsidian2.debounce)(() => this.updateStyles(), 250, true);
    // Re-apply (no rule re-evaluation) when the file-explorer DOM changes.
    this.debouncedApply = (0, import_obsidian2.debounce)(() => this.applyStyles(), 50, true);
    /** Debounced save + refresh for rapid-fire settings inputs (typing, color drag). */
    this.scheduleSaveAndUpdate = (0, import_obsidian2.debounce)(
      () => {
        this.saveSettings().catch(console.error);
        this.updateStyles();
      },
      250,
      true
    );
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FileFolderHighlighterSettingTab(this.app, this));
    this.addCommand({
      id: "toggle-hierarchy-highlighting",
      name: "Toggle hierarchy highlighting",
      callback: async () => {
        this.settings.hierarchyEnabled = !this.settings.hierarchyEnabled;
        await this.saveSettings();
        this.updateStyles();
        new import_obsidian2.Notice(
          `Hierarchy highlighting ${this.settings.hierarchyEnabled ? "enabled" : "disabled"}`
        );
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        this.buildColorMenu(menu, file);
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateHierarchy();
        this.applyStyles();
        window.setTimeout(() => {
          this.applyStyles();
        }, 100);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", () => {
        this.debouncedUpdate();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        const prefix = oldPath + "/";
        let changed = false;
        for (const entry of this.settings.fileColors) {
          if (entry.path === oldPath) {
            entry.path = file.path;
            changed = true;
          } else if (entry.path.startsWith(prefix)) {
            entry.path = file.path + "/" + entry.path.slice(prefix.length);
            changed = true;
          }
        }
        if (changed) await this.saveSettings();
        this.debouncedUpdate();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async (file) => {
        const prefix = file.path + "/";
        const before = this.settings.fileColors.length;
        this.settings.fileColors = this.settings.fileColors.filter(
          (e) => e.path !== file.path && !e.path.startsWith(prefix)
        );
        if (this.settings.fileColors.length !== before) await this.saveSettings();
        this.debouncedUpdate();
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        if (this.settings.yamlRules.length === 0) return;
        this.debouncedUpdate();
      })
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.setupExplorerObserver();
        this.applyStyles();
        window.setTimeout(() => {
          this.setupExplorerObserver();
          this.applyStyles();
        }, 100);
      })
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
    this.registerDomEvent(window, "focus", () => {
      this.applyStyles();
    });
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.updateStyles();
      })
    );
  }
  onunload() {
    var _a;
    this.debouncedUpdate.cancel();
    this.debouncedApply.cancel();
    this.scheduleSaveAndUpdate.cancel();
    (_a = this.explorerObserver) == null ? void 0 : _a.disconnect();
    this.explorerObserver = null;
    this.clearAppliedStyles();
    void this.saveSettings();
  }
  async loadSettings() {
    this.settings = migrateSettings(await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  buildColorMenu(menu, file) {
    const hasColor = this.settings.fileColors.some((e) => e.path === file.path);
    if (this.settings.colorCombos.length === 0 && !hasColor) return;
    const proto = import_obsidian2.MenuItem.prototype;
    const hasSubmenu = typeof proto.setSubmenu === "function";
    if (!hasSubmenu) {
      this.settings.colorCombos.forEach((combo) => {
        menu.addItem((item) => {
          item.setTitle(`Color: ${combo.name || "Unnamed"}`).setSection("ffh-colors").onClick(async () => {
            await this.setFileColor(file.path, combo.id);
          });
        });
      });
      if (hasColor) {
        menu.addItem((item) => {
          item.setTitle("Clear color").setIcon("x-circle").setSection("ffh-colors").onClick(async () => {
            await this.clearFileColor(file.path);
          });
        });
      }
      return;
    }
    menu.addItem((item) => {
      item.setTitle("File/folder color options").setSection("ffh-colors");
      const submenu = item.setSubmenu();
      this.settings.colorCombos.forEach((combo) => {
        submenu.addItem((subItem) => {
          const title = createFragment((frag) => {
            const span = frag.createSpan({ text: combo.name || "Unnamed" });
            const { font, bg } = this.pickColors(combo);
            if (font || bg) {
              span.setCssStyles({
                padding: "1px 8px",
                borderRadius: "3px",
                ...font ? { color: font } : {},
                ...bg ? { backgroundColor: bg } : {}
              });
            }
          });
          subItem.setTitle(title).onClick(async () => {
            await this.setFileColor(file.path, combo.id);
          });
        });
      });
      if (hasColor) {
        submenu.addItem((subItem) => {
          subItem.setTitle("Clear color").setIcon("x-circle").onClick(async () => {
            await this.clearFileColor(file.path);
          });
        });
      }
    });
  }
  async setFileColor(path, comboId) {
    const idx = this.settings.fileColors.findIndex((e) => e.path === path);
    if (idx >= 0) {
      this.settings.fileColors[idx].comboId = comboId;
    } else {
      this.settings.fileColors.push({ path, comboId });
    }
    await this.saveSettings();
    this.updateStyles();
  }
  async clearFileColor(path) {
    this.settings.fileColors = this.settings.fileColors.filter((e) => e.path !== path);
    await this.saveSettings();
    this.updateStyles();
  }
  updateHierarchy() {
    this.currentHierarchyPaths = /* @__PURE__ */ new Set();
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      const parts = activeFile.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        this.currentHierarchyPaths.add(parts.slice(0, i).join("/"));
      }
    }
    if (this.settings.hierarchyEnabled) this.debouncedUpdate();
  }
  isDarkTheme() {
    return activeDocument.body.classList.contains("theme-dark");
  }
  /** Resolves a rule's Light/Dark pair down to the colors active for the current theme. */
  pickColors(t) {
    const safe = (c) => SAFE_COLOR.test(c) ? c : "";
    const dark = this.isDarkTheme();
    return {
      font: safe(dark ? t.fontColorDark : t.fontColorLight),
      bg: safe(dark ? t.bgColorDark : t.bgColorLight)
    };
  }
  updateStyles() {
    var _a;
    const navFile = /* @__PURE__ */ new Map();
    const navFolder = /* @__PURE__ */ new Map();
    const tabStyles = /* @__PURE__ */ new Map();
    const files = this.app.vault.getFiles();
    const folders = this.getAllFolders();
    for (const rule of this.settings.regexRules) {
      if (!rule.pattern) continue;
      const { font, bg } = this.pickColors(rule);
      if (!font && !bg) continue;
      let regex;
      try {
        regex = new RegExp(rule.pattern);
      } catch (e) {
        continue;
      }
      const style = { font, bg };
      if (rule.appliesTo !== "folders") {
        for (const file of files) {
          if (regex.test(file.basename)) {
            navFile.set(file.path, style);
            if (rule.applyToTab) tabStyles.set(file.path, style);
          }
        }
      }
      if (rule.appliesTo !== "files") {
        for (const folder of folders) {
          if (regex.test(folder.name)) navFolder.set(folder.path, style);
        }
      }
    }
    for (const rule of this.settings.yamlRules) {
      if (!rule.key || !rule.value) continue;
      const { font, bg } = this.pickColors(rule);
      if (!font && !bg) continue;
      const target = rule.value.trim();
      const style = { font, bg };
      for (const file of files) {
        const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
        if (!fm || typeof fm !== "object") continue;
        const val = fm[rule.key];
        if (val === void 0 || val === null) continue;
        const toComparable = (v) => {
          if (typeof v === "string") return v.trim();
          if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
          return "";
        };
        const matches = Array.isArray(val) ? val.some((v) => toComparable(v) === target) : toComparable(val) === target;
        if (matches) navFile.set(file.path, style);
      }
    }
    for (const rule of this.settings.conditionalRules) {
      if (!rule.folderPattern || !rule.filePattern) continue;
      const { font, bg } = this.pickColors(rule);
      if (!font && !bg) continue;
      let folderRe, fileRe;
      try {
        folderRe = new RegExp(rule.folderPattern);
      } catch (e) {
        continue;
      }
      try {
        fileRe = new RegExp(rule.filePattern);
      } catch (e) {
        continue;
      }
      const style = { font, bg };
      for (const folder of folders) {
        if (!folderRe.test(folder.name)) continue;
        const candidates = [];
        for (const child of folder.children) {
          if (!(child instanceof import_obsidian2.TFile)) continue;
          const m = fileRe.exec(child.basename);
          if ((m == null ? void 0 : m[1]) !== void 0) {
            const val = parseFloat(m[1]);
            if (!isNaN(val)) candidates.push({ file: child, value: val });
          }
        }
        if (candidates.length === 0) continue;
        const winner = candidates.reduce(
          (best, cur) => rule.condition === "max" ? cur.value > best.value ? cur : best : cur.value < best.value ? cur : best
        );
        navFile.set(winner.file.path, style);
        if (rule.applyToTab) tabStyles.set(winner.file.path, style);
      }
    }
    if (this.settings.hierarchyEnabled) {
      const { font, bg } = this.pickColors({
        fontColorLight: this.settings.hierarchyFontColorLight,
        bgColorLight: this.settings.hierarchyBgColorLight,
        fontColorDark: this.settings.hierarchyFontColorDark,
        bgColorDark: this.settings.hierarchyBgColorDark
      });
      if (font || bg) {
        const style = { font, bg };
        for (const path of this.currentHierarchyPaths) navFolder.set(path, style);
      }
    }
    for (const entry of this.settings.fileColors) {
      const combo = this.settings.colorCombos.find((c) => c.id === entry.comboId);
      if (!combo) continue;
      const { font, bg } = this.pickColors(combo);
      if (!font && !bg) continue;
      const style = { font, bg };
      navFile.set(entry.path, style);
      navFolder.set(entry.path, style);
      if (combo.applyToTab) tabStyles.set(entry.path, style);
    }
    this.navFileStyles = navFile;
    this.navFolderStyles = navFolder;
    this.tabStyleMap = tabStyles;
    this.applyStyles();
  }
  getFileExplorerContainers() {
    return this.app.workspace.getLeavesOfType("file-explorer").map((l) => l.view.containerEl);
  }
  setupExplorerObserver() {
    var _a;
    const containers = this.getFileExplorerContainers();
    const currentSet = new Set(containers);
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
    (_a = this.explorerObserver) == null ? void 0 : _a.disconnect();
    this.observedContainers = currentSet;
    if (containers.length === 0) {
      this.explorerObserver = null;
      return;
    }
    this.explorerObserver = new MutationObserver(() => this.debouncedApply());
    for (const c of containers) {
      this.explorerObserver.observe(c, { childList: true, subtree: true });
    }
  }
  applyStyles() {
    this.setupExplorerObserver();
    this.clearAppliedStyles();
    this.applyNavStyles();
    this.applyTabStyles();
  }
  applyTo(el, style) {
    if (style.font) el.style.setProperty("color", style.font, "important");
    if (style.bg) el.style.setProperty("background-color", style.bg, "important");
    el.addClass("ffh-styled");
    this.styledEls.add(el);
  }
  clearAppliedStyles() {
    for (const el of this.styledEls) {
      el.style.removeProperty("color");
      el.style.removeProperty("background-color");
      el.removeClass("ffh-styled");
    }
    this.styledEls.clear();
  }
  applyNavStyles() {
    if (this.navFileStyles.size === 0 && this.navFolderStyles.size === 0) return;
    for (const container of this.getFileExplorerContainers()) {
      container.querySelectorAll(".nav-file-title").forEach((el) => {
        const path = el.getAttribute("data-path");
        if (!path) return;
        const style = this.navFileStyles.get(path);
        if (style) this.applyTo(el, style);
      });
      container.querySelectorAll(".nav-folder-title").forEach((el) => {
        const path = el.getAttribute("data-path");
        if (!path) return;
        const style = this.navFolderStyles.get(path);
        if (style) this.applyTo(el, style);
      });
    }
  }
  applyTabStyles() {
    if (this.tabStyleMap.size === 0) return;
    this.app.workspace.iterateAllLeaves((leaf) => {
      var _a;
      const file = leaf.view.file;
      if (!file) return;
      const style = this.tabStyleMap.get(file.path);
      if (!style) return;
      const tl = leaf;
      const target = (_a = tl.tabHeaderInnerTitleEl) != null ? _a : tl.tabHeaderEl;
      if (!target) return;
      this.applyTo(target, style);
    });
  }
  getAllFolders() {
    return this.app.vault.getAllLoadedFiles().filter((f) => f instanceof import_obsidian2.TFolder && f.path !== "/" && f.path !== "");
  }
};

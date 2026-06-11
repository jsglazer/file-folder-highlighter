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
  default: () => DynamicFileFolderHighlighterPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/settings.ts
var DEFAULT_SETTINGS = {
  colorCombos: [],
  fileColors: [],
  hierarchyEnabled: false,
  hierarchyFontColor: "#ffffff",
  hierarchyBgColor: "#2c7be5",
  regexRules: [],
  yamlRules: [],
  conditionalRules: []
};

// src/settingsTab.ts
var import_obsidian = require("obsidian");
function genId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function")
    return c.randomUUID();
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
var DynamicFileFolderHighlighterSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Color combinations" });
    containerEl.createEl("p", {
      text: "Named color combinations you can assign to files and folders via right-click. Leave font or background unset to keep the Obsidian default.",
      cls: "setting-item-description"
    });
    const combosEl = containerEl.createDiv("hh-list");
    this.renderCombos(combosEl);
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("Add combination").setCta().onClick(async () => {
        this.plugin.settings.colorCombos.push({
          id: genId(),
          name: "New combination",
          fontColor: "#ffffff",
          bgColor: "#4a90d9"
        });
        await this.plugin.saveSettings();
        this.renderCombos(combosEl);
        this.plugin.updateStyles();
      })
    );
    containerEl.createEl("h2", { text: "Hierarchy highlighting" });
    new import_obsidian.Setting(containerEl).setName("Enable").setDesc("Highlight all ancestor folders of the currently active file.").addToggle(
      (t) => t.setValue(this.plugin.settings.hierarchyEnabled).onChange(async (v) => {
        this.plugin.settings.hierarchyEnabled = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      })
    );
    const hierFontRow = new import_obsidian.Setting(containerEl).setName("Font color").setDesc("Leave unset to use the Obsidian default.");
    this.addColorInput(hierFontRow.controlEl, "", this.plugin.settings.hierarchyFontColor, (v) => {
      this.plugin.settings.hierarchyFontColor = v;
      this.plugin.scheduleSaveAndUpdate();
    });
    const hierBgRow = new import_obsidian.Setting(containerEl).setName("Background color").setDesc("Leave unset to use the Obsidian default.");
    this.addColorInput(hierBgRow.controlEl, "", this.plugin.settings.hierarchyBgColor, (v) => {
      this.plugin.settings.hierarchyBgColor = v;
      this.plugin.scheduleSaveAndUpdate();
    });
    containerEl.createEl("h2", { text: "Regex highlighting rules" });
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
          fontColor: "#ffffff",
          bgColor: "#e74c3c",
          appliesTo: "both"
        });
        await this.plugin.saveSettings();
        this.renderRules(rulesEl);
      })
    );
    containerEl.createEl("h2", { text: "YAML frontmatter rules" });
    containerEl.createEl("p", {
      text: "Apply colors to files whose frontmatter contains a specific key/value pair (e.g. status: Refine). Files only \u2014 folders have no frontmatter.",
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
          fontColor: "#ffffff",
          bgColor: "#27ae60"
        });
        await this.plugin.saveSettings();
        this.renderYamlRules(yamlRulesEl);
      })
    );
    containerEl.createEl("h2", { text: "Conditional highlighting rules" });
    containerEl.createEl("p", {
      text: "Highlight the file with the highest or lowest numeric value in folders matching a name pattern.",
      cls: "setting-item-description"
    });
    containerEl.createEl("p", {
      text: 'Example: folder pattern "^Updates$", file pattern "Update(\\d+)" with condition Max highlights the latest update file in every Updates folder.',
      cls: "setting-item-description"
    });
    const condRulesEl = containerEl.createDiv("hh-list");
    this.renderConditionalRules(condRulesEl);
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => btn.setButtonText("Add conditional rule").setCta().onClick(async () => {
        this.plugin.settings.conditionalRules.push({
          id: genId(),
          name: "New rule",
          fontColor: "#ffffff",
          bgColor: "#9b59b6",
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
      container.createEl("p", { text: "No combinations defined.", cls: "setting-item-description hh-empty" });
      return;
    }
    this.plugin.settings.colorCombos.forEach((combo, i) => {
      const row = container.createDiv("hh-row");
      const preview = createSpan({ cls: "hh-preview", text: combo.name || "Preview" });
      if (combo.fontColor)
        preview.style.color = combo.fontColor;
      if (combo.bgColor)
        preview.style.backgroundColor = combo.bgColor;
      const nameInput = row.createEl("input", { cls: "hh-input hh-name-input", placeholder: "Name" });
      nameInput.type = "text";
      nameInput.value = combo.name;
      nameInput.addEventListener("input", () => {
        combo.name = nameInput.value;
        preview.textContent = combo.name || "Preview";
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addColorInput(row, "Font", combo.fontColor, (v) => {
        combo.fontColor = v;
        preview.style.color = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addColorInput(row, "BG", combo.bgColor, (v) => {
        combo.bgColor = v;
        preview.style.backgroundColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      row.appendChild(preview);
      this.addDeleteButton(row, "Delete combination", async () => {
        this.plugin.settings.colorCombos.splice(i, 1);
        this.plugin.settings.fileColors = this.plugin.settings.fileColors.filter((e) => e.comboId !== combo.id);
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
      container.createEl("p", { text: "No rules defined.", cls: "setting-item-description hh-empty" });
      return;
    }
    this.plugin.settings.regexRules.forEach((rule, i) => {
      const row = container.createDiv("hh-row");
      const nameInput = row.createEl("input", { cls: "hh-input hh-name-input", placeholder: "Rule name" });
      nameInput.type = "text";
      nameInput.value = rule.name;
      nameInput.addEventListener("input", () => {
        rule.name = nameInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });
      const patternInput = row.createEl("input", { cls: "hh-input hh-pattern-input", placeholder: "Regex pattern" });
      patternInput.type = "text";
      patternInput.value = rule.pattern;
      this.applyPatternValidation(patternInput, rule.pattern);
      patternInput.addEventListener("input", () => {
        rule.pattern = patternInput.value;
        this.applyPatternValidation(patternInput, rule.pattern);
        this.plugin.scheduleSaveAndUpdate();
      });
      const select = row.createEl("select", { cls: "hh-select" });
      for (const [val, label] of [["files", "Files"], ["folders", "Folders"], ["both", "Files & Folders"]]) {
        const opt = select.createEl("option");
        opt.value = val;
        opt.textContent = label;
      }
      select.value = rule.appliesTo;
      select.addEventListener("change", async () => {
        rule.appliesTo = select.value;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
      this.addColorInput(row, "Font", rule.fontColor, (v) => {
        rule.fontColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addColorInput(row, "BG", rule.bgColor, (v) => {
        rule.bgColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addTabToggle(row, rule);
      this.addDeleteButton(row, "Delete rule", async () => {
        this.plugin.settings.regexRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderRules(container);
        this.plugin.updateStyles();
      });
    });
  }
  // ── YAML rule list ───────────────────────────────────────────────────────────
  renderYamlRules(container) {
    container.empty();
    if (this.plugin.settings.yamlRules.length === 0) {
      container.createEl("p", { text: "No YAML rules defined.", cls: "setting-item-description hh-empty" });
      return;
    }
    this.plugin.settings.yamlRules.forEach((rule, i) => {
      const row = container.createDiv("hh-row");
      const nameInput = row.createEl("input", { cls: "hh-input hh-name-input", placeholder: "Rule name" });
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
      const valueInput = row.createEl("input", { cls: "hh-input hh-value-input", placeholder: "Value" });
      valueInput.type = "text";
      valueInput.value = rule.value;
      valueInput.addEventListener("input", () => {
        rule.value = valueInput.value;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addColorInput(row, "Font", rule.fontColor, (v) => {
        rule.fontColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addColorInput(row, "BG", rule.bgColor, (v) => {
        rule.bgColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
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
      container.createEl("p", { text: "No conditional rules defined.", cls: "setting-item-description hh-empty" });
      return;
    }
    this.plugin.settings.conditionalRules.forEach((rule, i) => {
      const group = container.createDiv("hh-cond-group");
      const row1 = group.createDiv("hh-row hh-cond-header");
      const nameInput = row1.createEl("input", { cls: "hh-input hh-name-input", placeholder: "Rule name" });
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
      const folderInput = row2.createEl("input", { cls: "hh-input hh-pattern-input", placeholder: "Folder name regex" });
      folderInput.type = "text";
      folderInput.value = rule.folderPattern;
      this.applyPatternValidation(folderInput, rule.folderPattern);
      folderInput.addEventListener("input", () => {
        rule.folderPattern = folderInput.value;
        this.applyPatternValidation(folderInput, rule.folderPattern);
        this.plugin.scheduleSaveAndUpdate();
      });
      const fileInput = row2.createEl("input", { cls: "hh-input hh-pattern-input", placeholder: "File name regex (capture group = number)" });
      fileInput.type = "text";
      fileInput.value = rule.filePattern;
      this.applyPatternValidation(fileInput, rule.filePattern, true);
      fileInput.addEventListener("input", () => {
        rule.filePattern = fileInput.value;
        this.applyPatternValidation(fileInput, rule.filePattern, true);
        this.plugin.scheduleSaveAndUpdate();
      });
      const condSelect = row2.createEl("select", { cls: "hh-select hh-cond-select" });
      for (const [val, label] of [["max", "Max"], ["min", "Min"]]) {
        const opt = condSelect.createEl("option");
        opt.value = val;
        opt.textContent = label;
      }
      condSelect.value = rule.condition;
      condSelect.addEventListener("change", async () => {
        rule.condition = condSelect.value;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
      this.addColorInput(row2, "Font", rule.fontColor, (v) => {
        rule.fontColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addColorInput(row2, "BG", rule.bgColor, (v) => {
        rule.bgColor = v;
        this.plugin.scheduleSaveAndUpdate();
      });
      this.addTabToggle(row2, rule);
    });
  }
  // ── Helpers ─────────────────────────────────────────────────────────────────
  addColorInput(parent, label, value, onChange) {
    const wrap = parent.createDiv("hh-color-wrap");
    if (label)
      wrap.createEl("span", { text: label, cls: "hh-color-label" });
    const isSet = value !== "";
    const checkbox = wrap.createEl("input");
    checkbox.type = "checkbox";
    checkbox.checked = isSet;
    checkbox.classList.add("hh-color-toggle");
    checkbox.title = "Use custom color";
    const input = wrap.createEl("input", { cls: "hh-color-input" });
    input.type = "color";
    input.value = isSet ? value : "#ffffff";
    input.style.visibility = isSet ? "visible" : "hidden";
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        input.style.visibility = "visible";
        onChange(input.value);
      } else {
        input.style.visibility = "hidden";
        onChange("");
      }
    });
    input.addEventListener("input", () => {
      if (checkbox.checked)
        onChange(input.value);
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
    chk.addEventListener("change", async () => {
      rule.applyToTab = chk.checked;
      await this.plugin.saveSettings();
      this.plugin.updateStyles();
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
var DynamicFileFolderHighlighterPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.currentHierarchyPaths = /* @__PURE__ */ new Set();
    // Computed as a byproduct of updateStyles(); applyTabStyles() reads from it
    // so layout-change handling never has to rescan the vault.
    this.tabStyleMap = /* @__PURE__ */ new Map();
    this.debouncedUpdate = (0, import_obsidian2.debounce)(() => this.updateStyles(), 250, true);
    /** Debounced save + refresh for rapid-fire settings inputs (typing, color drag). */
    this.scheduleSaveAndUpdate = (0, import_obsidian2.debounce)(() => {
      this.saveSettings().catch(console.error);
      this.updateStyles();
    }, 250, true);
  }
  async onload() {
    await this.loadSettings();
    this.styleEl = document.createElement("style");
    this.styleEl.id = "dffh-styles";
    document.head.appendChild(this.styleEl);
    this.addSettingTab(new DynamicFileFolderHighlighterSettingTab(this.app, this));
    this.addCommand({
      id: "toggle-hierarchy-highlighting",
      name: "Toggle hierarchy highlighting",
      callback: async () => {
        this.settings.hierarchyEnabled = !this.settings.hierarchyEnabled;
        await this.saveSettings();
        this.updateStyles();
        new import_obsidian2.Notice(`Hierarchy highlighting ${this.settings.hierarchyEnabled ? "enabled" : "disabled"}`);
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
        if (changed)
          await this.saveSettings();
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
        if (this.settings.fileColors.length !== before)
          await this.saveSettings();
        this.debouncedUpdate();
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        if (this.settings.yamlRules.length === 0)
          return;
        this.debouncedUpdate();
      })
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
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
  buildColorMenu(menu, file) {
    var _a;
    const hasColor = this.settings.fileColors.some((e) => e.path === file.path);
    if (this.settings.colorCombos.length === 0 && !hasColor)
      return;
    const hasSubmenu = typeof ((_a = import_obsidian2.MenuItem.prototype) == null ? void 0 : _a.setSubmenu) === "function";
    if (!hasSubmenu) {
      this.settings.colorCombos.forEach((combo) => {
        menu.addItem((item) => {
          item.setTitle(`Color: ${combo.name || "Unnamed"}`).setSection("dffh-colors").onClick(async () => {
            await this.setFileColor(file.path, combo.id);
          });
        });
      });
      if (hasColor) {
        menu.addItem((item) => {
          item.setTitle("Clear color").setIcon("x-circle").setSection("dffh-colors").onClick(async () => {
            await this.clearFileColor(file.path);
          });
        });
      }
      return;
    }
    menu.addItem((item) => {
      item.setTitle("Ff/Fld Color Options").setSection("dffh-colors");
      const submenu = item.setSubmenu();
      this.settings.colorCombos.forEach((combo) => {
        submenu.addItem((subItem) => {
          const frag = document.createDocumentFragment();
          const span = document.createElement("span");
          span.textContent = combo.name || "Unnamed";
          if (combo.fontColor || combo.bgColor) {
            if (combo.fontColor)
              span.style.color = combo.fontColor;
            if (combo.bgColor)
              span.style.backgroundColor = combo.bgColor;
            span.style.padding = "1px 8px";
            span.style.borderRadius = "3px";
          }
          frag.appendChild(span);
          subItem.setTitle(frag).onClick(async () => {
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
    if (this.settings.hierarchyEnabled)
      this.debouncedUpdate();
  }
  updateStyles() {
    var _a;
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const safe = (c) => SAFE_COLOR.test(c) ? c : "";
    const colorProps = (font, bg) => {
      let s = "";
      if (safe(font))
        s += `color:${font}!important;`;
      if (safe(bg))
        s += `background-color:${bg}!important;`;
      return s;
    };
    let css = "";
    const files = this.app.vault.getFiles();
    const folders = this.getAllFolders();
    const tabStyles = /* @__PURE__ */ new Map();
    for (const rule of this.settings.regexRules) {
      if (!rule.pattern)
        continue;
      const ruleProps = colorProps(rule.fontColor, rule.bgColor);
      if (!ruleProps)
        continue;
      let regex;
      try {
        regex = new RegExp(rule.pattern);
      } catch (e) {
        continue;
      }
      if (rule.appliesTo !== "folders") {
        for (const file of files) {
          if (regex.test(file.basename)) {
            css += `.nav-file-title[data-path="${esc(file.path)}"]{${ruleProps}}
`;
            if (rule.applyToTab) {
              tabStyles.set(file.path, { font: safe(rule.fontColor), bg: safe(rule.bgColor) });
            }
          }
        }
      }
      if (rule.appliesTo !== "files") {
        for (const folder of folders) {
          if (regex.test(folder.name)) {
            css += `.nav-folder-title[data-path="${esc(folder.path)}"]{${ruleProps}}
`;
          }
        }
      }
    }
    for (const rule of this.settings.yamlRules) {
      if (!rule.key || !rule.value)
        continue;
      const ruleProps = colorProps(rule.fontColor, rule.bgColor);
      if (!ruleProps)
        continue;
      const target = rule.value.trim();
      for (const file of files) {
        const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
        if (!fm)
          continue;
        const val = fm[rule.key];
        if (val === void 0 || val === null)
          continue;
        const matches = Array.isArray(val) ? val.some((v) => String(v).trim() === target) : String(val).trim() === target;
        if (matches) {
          css += `.nav-file-title[data-path="${esc(file.path)}"]{${ruleProps}}
`;
        }
      }
    }
    for (const rule of this.settings.conditionalRules) {
      if (!rule.folderPattern || !rule.filePattern)
        continue;
      const condProps = colorProps(rule.fontColor, rule.bgColor);
      if (!condProps)
        continue;
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
      for (const folder of folders) {
        if (!folderRe.test(folder.name))
          continue;
        const candidates = [];
        for (const child of folder.children) {
          if (!(child instanceof import_obsidian2.TFile))
            continue;
          const m = fileRe.exec(child.basename);
          if ((m == null ? void 0 : m[1]) !== void 0) {
            const val = parseFloat(m[1]);
            if (!isNaN(val))
              candidates.push({ file: child, value: val });
          }
        }
        if (candidates.length === 0)
          continue;
        const winner = candidates.reduce(
          (best, cur) => rule.condition === "max" ? cur.value > best.value ? cur : best : cur.value < best.value ? cur : best
        );
        css += `.nav-file-title[data-path="${esc(winner.file.path)}"]{${condProps}}
`;
        if (rule.applyToTab) {
          tabStyles.set(winner.file.path, { font: safe(rule.fontColor), bg: safe(rule.bgColor) });
        }
      }
    }
    if (this.settings.hierarchyEnabled) {
      const hierProps = colorProps(this.settings.hierarchyFontColor, this.settings.hierarchyBgColor);
      if (hierProps) {
        for (const path of this.currentHierarchyPaths) {
          css += `.nav-folder-title[data-path="${esc(path)}"]{${hierProps}}
`;
        }
      }
    }
    for (const entry of this.settings.fileColors) {
      const combo = this.settings.colorCombos.find((c) => c.id === entry.comboId);
      if (!combo)
        continue;
      const entryProps = colorProps(combo.fontColor, combo.bgColor);
      if (!entryProps)
        continue;
      css += `.nav-file-title[data-path="${esc(entry.path)}"],.nav-folder-title[data-path="${esc(entry.path)}"]{${entryProps}}
`;
    }
    this.styleEl.textContent = css;
    this.tabStyleMap = tabStyles;
    this.applyTabStyles();
  }
  clearTabStyles() {
    document.querySelectorAll(".dffh-tab-styled").forEach((el) => {
      const htmlEl = el;
      htmlEl.style.removeProperty("color");
      htmlEl.style.removeProperty("background-color");
      el.classList.remove("dffh-tab-styled");
    });
  }
  applyTabStyles() {
    this.clearTabStyles();
    if (this.tabStyleMap.size === 0)
      return;
    this.app.workspace.iterateAllLeaves((leaf) => {
      var _a;
      const file = leaf.view.file;
      if (!file)
        return;
      const style = this.tabStyleMap.get(file.path);
      if (!style)
        return;
      const tabEl = leaf.tabHeaderEl;
      const target = (_a = leaf.tabHeaderInnerTitleEl) != null ? _a : tabEl;
      if (!target)
        return;
      if (style.font)
        target.style.setProperty("color", style.font);
      if (style.bg)
        target.style.setProperty("background-color", style.bg);
      target.classList.add("dffh-tab-styled");
    });
  }
  getAllFolders() {
    return this.app.vault.getAllLoadedFiles().filter((f) => f instanceof import_obsidian2.TFolder && f.path !== "/" && f.path !== "");
  }
};

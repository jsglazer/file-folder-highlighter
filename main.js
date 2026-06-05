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
  default: () => HierarchyHighlighterPlugin
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
  regexRules: []
};

// src/settingsTab.ts
var import_obsidian = require("obsidian");
function genId() {
  return Math.random().toString(36).substring(2, 9);
}
var HierarchyHighlighterSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Color combinations" });
    containerEl.createEl("p", {
      text: "Named color combinations you can assign to files and folders via right-click.",
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
    new import_obsidian.Setting(containerEl).setName("Font color").addColorPicker(
      (c) => c.setValue(this.plugin.settings.hierarchyFontColor).onChange(async (v) => {
        this.plugin.settings.hierarchyFontColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Background color").addColorPicker(
      (c) => c.setValue(this.plugin.settings.hierarchyBgColor).onChange(async (v) => {
        this.plugin.settings.hierarchyBgColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      })
    );
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
      const nameInput = row.createEl("input", { cls: "hh-input hh-name-input", placeholder: "Name" });
      nameInput.type = "text";
      nameInput.value = combo.name;
      nameInput.addEventListener("input", async () => {
        combo.name = nameInput.value;
        preview.textContent = combo.name || "Preview";
        await this.plugin.saveSettings();
      });
      this.addColorInput(row, "Font", combo.fontColor, async (v) => {
        combo.fontColor = v;
        preview.style.color = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
      this.addColorInput(row, "BG", combo.bgColor, async (v) => {
        combo.bgColor = v;
        preview.style.backgroundColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
      const preview = row.createEl("span", { cls: "hh-preview", text: combo.name || "Preview" });
      preview.style.color = combo.fontColor;
      preview.style.backgroundColor = combo.bgColor;
      const del = row.createEl("button", { cls: "hh-btn-delete" });
      del.textContent = "\xD7";
      del.setAttribute("aria-label", "Delete combination");
      del.addEventListener("click", async () => {
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
      nameInput.addEventListener("input", async () => {
        rule.name = nameInput.value;
        await this.plugin.saveSettings();
      });
      const patternInput = row.createEl("input", { cls: "hh-input hh-pattern-input", placeholder: "Regex pattern" });
      patternInput.type = "text";
      patternInput.value = rule.pattern;
      this.applyPatternValidation(patternInput, rule.pattern);
      patternInput.addEventListener("input", async () => {
        rule.pattern = patternInput.value;
        this.applyPatternValidation(patternInput, rule.pattern);
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
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
      this.addColorInput(row, "Font", rule.fontColor, async (v) => {
        rule.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
      this.addColorInput(row, "BG", rule.bgColor, async (v) => {
        rule.bgColor = v;
        await this.plugin.saveSettings();
        this.plugin.updateStyles();
      });
      const del = row.createEl("button", { cls: "hh-btn-delete" });
      del.textContent = "\xD7";
      del.setAttribute("aria-label", "Delete rule");
      del.addEventListener("click", async () => {
        this.plugin.settings.regexRules.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderRules(container);
        this.plugin.updateStyles();
      });
    });
  }
  // ── Helpers ─────────────────────────────────────────────────────────────────
  addColorInput(parent, label, value, onChange) {
    const wrap = parent.createDiv("hh-color-wrap");
    wrap.createEl("span", { text: label, cls: "hh-color-label" });
    const input = wrap.createEl("input", { cls: "hh-color-input" });
    input.type = "color";
    input.value = value;
    input.addEventListener("input", () => onChange(input.value));
  }
  applyPatternValidation(input, pattern) {
    if (!pattern) {
      input.classList.remove("hh-invalid");
      return;
    }
    try {
      new RegExp(pattern);
      input.classList.remove("hh-invalid");
    } catch (e) {
      input.classList.add("hh-invalid");
    }
  }
};

// src/main.ts
var HierarchyHighlighterPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.currentHierarchyPaths = /* @__PURE__ */ new Set();
  }
  async onload() {
    await this.loadSettings();
    this.styleEl = document.createElement("style");
    this.styleEl.id = "hierarchy-highlighter-styles";
    document.head.appendChild(this.styleEl);
    this.addSettingTab(new HierarchyHighlighterSettingTab(this.app, this));
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
      this.app.vault.on("rename", (file, oldPath) => {
        const entry = this.settings.fileColors.find((e) => e.path === oldPath);
        if (entry) {
          entry.path = file.path;
          this.saveSettings();
          this.updateStyles();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        const before = this.settings.fileColors.length;
        this.settings.fileColors = this.settings.fileColors.filter((e) => e.path !== file.path);
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
  buildColorMenu(menu, file) {
    if (this.settings.colorCombos.length === 0)
      return;
    this.settings.colorCombos.forEach((combo) => {
      menu.addItem((item) => {
        const frag = document.createDocumentFragment();
        const span = document.createElement("span");
        span.textContent = combo.name;
        span.style.cssText = `color:${combo.fontColor};background-color:${combo.bgColor};padding:1px 8px;border-radius:3px;`;
        frag.appendChild(span);
        item.setTitle(frag).setSection("hh-colors").onClick(async () => {
          await this.setFileColor(file.path, combo.id);
        });
      });
    });
    if (this.settings.fileColors.some((e) => e.path === file.path)) {
      menu.addItem((item) => {
        item.setTitle("Clear color").setIcon("x-circle").setSection("hh-colors").onClick(async () => {
          await this.clearFileColor(file.path);
        });
      });
    }
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
    this.updateStyles();
  }
  updateStyles() {
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    let css = "";
    for (const rule of this.settings.regexRules) {
      if (!rule.pattern)
        continue;
      let regex;
      try {
        regex = new RegExp(rule.pattern);
      } catch (e) {
        continue;
      }
      if (rule.appliesTo !== "folders") {
        for (const file of this.app.vault.getFiles()) {
          if (regex.test(file.name)) {
            css += `.nav-file-title[data-path="${esc(file.path)}"]{color:${rule.fontColor}!important;background-color:${rule.bgColor}!important}
`;
          }
        }
      }
      if (rule.appliesTo !== "files") {
        for (const folder of this.getAllFolders()) {
          if (regex.test(folder.name)) {
            css += `.nav-folder-title[data-path="${esc(folder.path)}"]{color:${rule.fontColor}!important;background-color:${rule.bgColor}!important}
`;
          }
        }
      }
    }
    if (this.settings.hierarchyEnabled) {
      for (const path of this.currentHierarchyPaths) {
        css += `.nav-folder-title[data-path="${esc(path)}"]{color:${this.settings.hierarchyFontColor}!important;background-color:${this.settings.hierarchyBgColor}!important}
`;
      }
    }
    for (const entry of this.settings.fileColors) {
      const combo = this.settings.colorCombos.find((c) => c.id === entry.comboId);
      if (!combo)
        continue;
      css += `.nav-file-title[data-path="${esc(entry.path)}"],.nav-folder-title[data-path="${esc(entry.path)}"]{color:${combo.fontColor}!important;background-color:${combo.bgColor}!important}
`;
    }
    this.styleEl.textContent = css;
  }
  getAllFolders() {
    return this.app.vault.getAllLoadedFiles().filter((f) => f instanceof import_obsidian2.TFolder && f.path !== "/" && f.path !== "");
  }
};

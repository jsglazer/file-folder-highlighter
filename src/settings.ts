export interface ColorCombo {
  id: string;
  name: string;
  fontColor: string;  // "" = use Obsidian default
  bgColor: string;    // "" = use Obsidian default
}

export interface FileColorEntry {
  path: string;
  comboId: string;
}

export interface RegexRule {
  id: string;
  name: string;
  pattern: string;
  fontColor: string;  // "" = use Obsidian default
  bgColor: string;    // "" = use Obsidian default
  appliesTo: 'files' | 'folders' | 'both';
}

export interface ConditionalRule {
  id: string;
  name: string;
  fontColor: string;  // "" = use Obsidian default
  bgColor: string;    // "" = use Obsidian default
  folderPattern: string;
  filePattern: string;
  condition: 'max' | 'min';
}

export interface YamlRule {
  id: string;
  name: string;
  key: string;
  value: string;
  fontColor: string;  // "" = use Obsidian default
  bgColor: string;    // "" = use Obsidian default
}

export interface DynamicFileFolderHighlighterSettings {
  colorCombos: ColorCombo[];
  fileColors: FileColorEntry[];
  hierarchyEnabled: boolean;
  hierarchyFontColor: string;
  hierarchyBgColor: string;
  regexRules: RegexRule[];
  yamlRules: YamlRule[];
  conditionalRules: ConditionalRule[];
}

export const DEFAULT_SETTINGS: DynamicFileFolderHighlighterSettings = {
  colorCombos: [],
  fileColors: [],
  hierarchyEnabled: false,
  hierarchyFontColor: '#ffffff',
  hierarchyBgColor: '#2c7be5',
  regexRules: [],
  yamlRules: [],
  conditionalRules: [],
};

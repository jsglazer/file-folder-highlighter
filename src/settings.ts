export interface ColorCombo {
  id: string;
  name: string;
  fontColor: string;
  bgColor: string;
}

export interface FileColorEntry {
  path: string;
  comboId: string;
}

export interface RegexRule {
  id: string;
  name: string;
  pattern: string;
  fontColor: string;
  bgColor: string;
  appliesTo: 'files' | 'folders' | 'both';
}

export interface HierarchyHighlighterSettings {
  colorCombos: ColorCombo[];
  fileColors: FileColorEntry[];
  hierarchyEnabled: boolean;
  hierarchyFontColor: string;
  hierarchyBgColor: string;
  regexRules: RegexRule[];
}

export const DEFAULT_SETTINGS: HierarchyHighlighterSettings = {
  colorCombos: [],
  fileColors: [],
  hierarchyEnabled: false,
  hierarchyFontColor: '#ffffff',
  hierarchyBgColor: '#2c7be5',
  regexRules: [],
};

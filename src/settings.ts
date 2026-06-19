// "" = use Obsidian default for that theme.
export interface ThemedColors {
	fontColorLight: string;
	bgColorLight: string;
	fontColorDark: string;
	bgColorDark: string;
}

export interface ColorCombo extends ThemedColors {
	id: string;
	name: string;
	applyToTab?: boolean;
}

export interface FileColorEntry {
	path: string;
	comboId: string;
}

export interface RegexRule extends ThemedColors {
	id: string;
	name: string;
	pattern: string;
	appliesTo: 'files' | 'folders' | 'both';
	applyToTab?: boolean;
}

export interface ConditionalRule extends ThemedColors {
	id: string;
	name: string;
	folderPattern: string;
	filePattern: string;
	condition: 'max' | 'min';
	applyToTab?: boolean;
}

export interface YamlRule extends ThemedColors {
	id: string;
	name: string;
	key: string;
	value: string;
}

export interface FileFolderHighlighterSettings {
	colorCombos: ColorCombo[];
	fileColors: FileColorEntry[];
	hierarchyEnabled: boolean;
	hierarchyFontColorLight: string;
	hierarchyBgColorLight: string;
	hierarchyFontColorDark: string;
	hierarchyBgColorDark: string;
	regexRules: RegexRule[];
	yamlRules: YamlRule[];
	conditionalRules: ConditionalRule[];
}

export const DEFAULT_SETTINGS: FileFolderHighlighterSettings = {
	colorCombos: [],
	fileColors: [],
	hierarchyEnabled: false,
	hierarchyFontColorLight: '#ffffff',
	hierarchyBgColorLight: '#2c7be5',
	hierarchyFontColorDark: '#ffffff',
	hierarchyBgColorDark: '#2c7be5',
	regexRules: [],
	yamlRules: [],
	conditionalRules: [],
};

/**
 * Pre-1.3.0 data used a single fontColor/bgColor pair per entry. Lifts any
 * such legacy fields onto the new Light/Dark pair (same color for both
 * themes, matching prior behavior) so existing data.json files keep working.
 */
function migrateThemedColors(entry: Record<string, unknown>): Record<string, unknown> {
	const out = { ...entry };
	const legacyFont = out['fontColor'];
	if (typeof legacyFont === 'string') {
		if (out['fontColorLight'] === undefined) out['fontColorLight'] = legacyFont;
		if (out['fontColorDark'] === undefined) out['fontColorDark'] = legacyFont;
		delete out['fontColor'];
	}
	const legacyBg = out['bgColor'];
	if (typeof legacyBg === 'string') {
		if (out['bgColorLight'] === undefined) out['bgColorLight'] = legacyBg;
		if (out['bgColorDark'] === undefined) out['bgColorDark'] = legacyBg;
		delete out['bgColor'];
	}
	return out;
}

export function migrateSettings(raw: unknown): FileFolderHighlighterSettings {
	const data: Record<string, unknown> = { ...(raw as Record<string, unknown> | null) };

	for (const key of ['colorCombos', 'regexRules', 'yamlRules', 'conditionalRules'] as const) {
		const arr = data[key];
		if (Array.isArray(arr)) {
			data[key] = arr.map((entry) => migrateThemedColors(entry as Record<string, unknown>));
		}
	}

	const legacyHierarchyFont = data['hierarchyFontColor'];
	if (typeof legacyHierarchyFont === 'string') {
		if (data['hierarchyFontColorLight'] === undefined)
			data['hierarchyFontColorLight'] = legacyHierarchyFont;
		if (data['hierarchyFontColorDark'] === undefined)
			data['hierarchyFontColorDark'] = legacyHierarchyFont;
		delete data['hierarchyFontColor'];
	}
	const legacyHierarchyBg = data['hierarchyBgColor'];
	if (typeof legacyHierarchyBg === 'string') {
		if (data['hierarchyBgColorLight'] === undefined)
			data['hierarchyBgColorLight'] = legacyHierarchyBg;
		if (data['hierarchyBgColorDark'] === undefined)
			data['hierarchyBgColorDark'] = legacyHierarchyBg;
		delete data['hierarchyBgColor'];
	}

	return Object.assign({}, DEFAULT_SETTINGS, data);
}

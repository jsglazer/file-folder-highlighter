import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings';

describe('DEFAULT_SETTINGS', () => {
	it('starts with empty rule collections', () => {
		expect(DEFAULT_SETTINGS.colorCombos).toEqual([]);
		expect(DEFAULT_SETTINGS.fileColors).toEqual([]);
		expect(DEFAULT_SETTINGS.regexRules).toEqual([]);
		expect(DEFAULT_SETTINGS.yamlRules).toEqual([]);
		expect(DEFAULT_SETTINGS.conditionalRules).toEqual([]);
	});

	it('defaults the folder hierarchy highlight to off', () => {
		expect(DEFAULT_SETTINGS.hierarchyEnabled).toBe(false);
		expect(DEFAULT_SETTINGS.hierarchyFontColor).toBe('#ffffff');
		expect(DEFAULT_SETTINGS.hierarchyBgColor).toBe('#2c7be5');
	});
});

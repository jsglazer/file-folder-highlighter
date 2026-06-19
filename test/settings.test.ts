import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, migrateSettings } from '../src/settings';

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
		expect(DEFAULT_SETTINGS.hierarchyFontColorLight).toBe('#ffffff');
		expect(DEFAULT_SETTINGS.hierarchyBgColorLight).toBe('#2c7be5');
		expect(DEFAULT_SETTINGS.hierarchyFontColorDark).toBe('#ffffff');
		expect(DEFAULT_SETTINGS.hierarchyBgColorDark).toBe('#2c7be5');
	});
});

describe('migrateSettings', () => {
	it('returns defaults when given no prior data', () => {
		expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
	});

	it('lifts legacy single fontColor/bgColor onto both theme variants for every rule list', () => {
		const legacy = {
			colorCombos: [{ id: 'a', name: 'Key', fontColor: '#050000', bgColor: '#7af5bc' }],
			regexRules: [
				{
					id: 'b',
					name: 'Dev Docs',
					pattern: '\\bDev$',
					fontColor: '#0033ff',
					bgColor: '',
					appliesTo: 'files',
					applyToTab: true,
				},
			],
			conditionalRules: [
				{
					id: 'c',
					name: 'Latest Update',
					folderPattern: '^Updates$',
					filePattern: 'Update(\\d+)',
					condition: 'max',
					bgColor: '',
					fontColor: '#15c412',
					applyToTab: true,
				},
			],
			yamlRules: [],
		};

		const migrated = migrateSettings(legacy);

		expect(migrated.colorCombos[0]).toMatchObject({
			fontColorLight: '#050000',
			fontColorDark: '#050000',
			bgColorLight: '#7af5bc',
			bgColorDark: '#7af5bc',
		});
		expect(migrated.regexRules[0]).toMatchObject({
			fontColorLight: '#0033ff',
			fontColorDark: '#0033ff',
			bgColorLight: '',
			bgColorDark: '',
		});
		expect(migrated.conditionalRules[0]).toMatchObject({
			fontColorLight: '#15c412',
			fontColorDark: '#15c412',
		});

		// Legacy keys are removed once migrated.
		expect(migrated.colorCombos[0]).not.toHaveProperty('fontColor');
		expect(migrated.colorCombos[0]).not.toHaveProperty('bgColor');
	});

	it('lifts legacy hierarchyFontColor/hierarchyBgColor onto both theme variants', () => {
		const migrated = migrateSettings({
			hierarchyEnabled: true,
			hierarchyFontColor: '',
			hierarchyBgColor: '#d6e5d9',
		});

		expect(migrated.hierarchyFontColorLight).toBe('');
		expect(migrated.hierarchyFontColorDark).toBe('');
		expect(migrated.hierarchyBgColorLight).toBe('#d6e5d9');
		expect(migrated.hierarchyBgColorDark).toBe('#d6e5d9');
	});

	it('leaves already-migrated Light/Dark fields untouched', () => {
		const migrated = migrateSettings({
			colorCombos: [
				{
					id: 'a',
					name: 'Key',
					fontColorLight: '#111111',
					fontColorDark: '#222222',
					bgColorLight: '#333333',
					bgColorDark: '#444444',
				},
			],
		});

		expect(migrated.colorCombos[0]).toMatchObject({
			fontColorLight: '#111111',
			fontColorDark: '#222222',
			bgColorLight: '#333333',
			bgColorDark: '#444444',
		});
	});
});

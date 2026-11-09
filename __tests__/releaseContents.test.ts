export {};

const requiredFiles = [
	'/dist-electron/electron/main.js',
	'/dist-electron/electron/preload.js',
	'/dist-electron/src/Commands/Fun/hangman.js',
	'/public/admin/dashboard.html',
	'/public/admin/eventsubs.html',
	'/public/admin/logs.html',
	'/public/assets/css/admin.css',
	'/node_modules/express/package.json',
	'/node_modules/vue/dist/vue.global.prod.js',
];
const mockListPackage = jest.fn();

describe('release archive contents check', () => {
	beforeEach(() => {
		jest.resetModules();
		mockListPackage.mockReset().mockReturnValue(requiredFiles);
		jest.doMock('@electron/asar', () => ({ listPackage: mockListPackage }));
		jest.spyOn(console, 'log').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it('accepts a complete synthetic archive without opening an actual release', () => {
		expect(() => require('../scripts/check-release-contents')).not.toThrow();
		expect(mockListPackage).toHaveBeenCalledTimes(1);
	});

	it.each(requiredFiles)('rejects an archive missing %s', file => {
		mockListPackage.mockReturnValue(requiredFiles.filter(item => item !== file));
		expect(() => require('../scripts/check-release-contents')).toThrow(`Missing release file: ${file}`);
	});

	it.each(['/.env', '/data/example.sqlite', '/logs/example.log'])('rejects private runtime entry %s', file => {
		mockListPackage.mockReturnValue([...requiredFiles, file]);
		expect(() => require('../scripts/check-release-contents')).toThrow(`Release contains private runtime data: ${file}`);
	});
});

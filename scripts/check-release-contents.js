const asar = require('@electron/asar');
const path = require('node:path');

const archive = path.join('release', 'win-unpacked', 'resources', 'app.asar');
const files = new Set(asar.listPackage(archive).map(file => file.split(path.sep).join('/')));
for (const required of [
	'/dist-electron/electron/main.js',
	'/dist-electron/electron/preload.js',
	'/dist-electron/src/Commands/Fun/hangman.js',
	'/public/admin/dashboard.html',
	'/public/admin/eventsubs.html',
	'/public/admin/logs.html',
	'/public/assets/css/admin.css',
	'/node_modules/express/package.json',
	'/node_modules/vue/dist/vue.global.prod.js',
]) {
	if (!files.has(required)) throw new Error(`Missing release file: ${required}`);
}
for (const file of files) {
	if (file === '/.env' || file.startsWith('/data/') || file.startsWith('/logs/')) {
		throw new Error(`Release contains private runtime data: ${file}`);
	}
}
console.log('PASS: release archive includes runtime assets and excludes local environment and data');

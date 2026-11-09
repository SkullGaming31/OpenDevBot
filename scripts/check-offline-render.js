const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Debugging port required');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function evaluate(target, expression) {
	const socket = new WebSocket(target.webSocketDebuggerUrl);
	try {
		await new Promise((resolve, reject) => {
			socket.addEventListener('open', resolve, { once: true });
			socket.addEventListener('error', () => reject(new Error('DevTools connection failed')), { once: true });
		});
		return await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('DevTools evaluation timed out')), 5000);
			socket.addEventListener('message', event => {
				const message = JSON.parse(String(event.data));
				if (message.id !== 1) return;
				clearTimeout(timeout);
				if (message.error || message.result.exceptionDetails) {
					reject(new Error('DevTools evaluation failed'));
				} else {
					resolve(message.result.result.value);
				}
			});
			socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
		});
	} finally {
		socket.close();
	}
}

async function waitForPage(name) {
	const deadline = Date.now() + 30000;
	while (Date.now() < deadline) {
		const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
		const target = targets.find(item => item.type === 'page' && item.url.endsWith(`/public/admin/${name}.html`));
		if (target && await evaluate(target, "Boolean(window.Vue && document.querySelector('#app[data-v-app]'))")) {
			return target;
		}
		await delay(500);
	}
	throw new Error(`${name} did not render with bundled Vue while external hosts were blocked`);
}

async function main() {
	const dashboard = await waitForPage('dashboard');
	const adminPage = await evaluate(dashboard, "(async () => { const result = await window.adminApi.fetch('/admin/eventsubs'); return typeof result === 'string' && result.includes('EventSub'); })()");
	if (!adminPage) throw new Error('Dashboard could not access the authenticated EventSub page');
	const opened = await evaluate(dashboard, "Boolean(window.logsApi && (window.logsApi.openWindow(), true))");
	if (!opened) throw new Error('Dashboard logs bridge is unavailable');
	await waitForPage('logs');
	console.log('PASS: dashboard and logs window rendered with bundled Vue while external hosts were blocked');
}

main().catch(error => {
	console.error(error.message);
	process.exitCode = 1;
});

const info = jest.fn((...args: any[]) => {
	try { console.log(...args); } catch (e) { /* ignore */ }
});
const warn = jest.fn((...args: any[]) => {
	try { console.warn(...args); } catch (e) { /* ignore */ }
});
const error = jest.fn((...args: any[]) => {
	try { console.error(...args); } catch (e) { /* ignore */ }
});
const debug = jest.fn((...args: any[]) => {
	try { console.debug(...args); } catch (e) { try { console.log(...args); } catch (e2) { /* ignore */ } }
});
const time = jest.fn();
const timeEnd = jest.fn();

export default {
	info,
	warn,
	error,
	debug,
	time,
	timeEnd,
};

export { info, warn, error, debug };

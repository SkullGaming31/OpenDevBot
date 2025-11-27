const info = jest.fn();
const warn = jest.fn();
const error = jest.fn();
const debug = jest.fn();
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

import { parseMonitorVisibility } from '../monitorVisibility';

describe('parseMonitorVisibility', () => {
	it('parses a serialized visibility map without losing false values', () => {
		expect(parseMonitorVisibility('{"chat":true,"follow":false}')).toEqual({
			chat: true,
			follow: false,
		});
	});

	it.each(['null', '[]', '{"chat":"yes"}', '42'])('rejects invalid map payload %s', (serialized) => {
		expect(parseMonitorVisibility(serialized)).toBeUndefined();
	});

	it('rejects malformed JSON explicitly', () => {
		expect(() => parseMonitorVisibility('{invalid')).toThrow(SyntaxError);
	});
});

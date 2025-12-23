import quoteCommand from '../Commands/Information/quote';
import QuoteModel from '../database/models/Quote';
import { getChatClient } from '../chat';

// Do not auto-mock QuoteModel (we'll spy on its static methods). Mock chat client only.
jest.mock('../chat');

describe('quote command', () => {
	const sayMock = jest.fn();
	beforeEach(() => {
		(getChatClient as any).mockResolvedValue({ say: sayMock });
		sayMock.mockReset();
	});

	test('add -> saves quote and sends confirmation', async () => {
		const saveSpy = jest.spyOn(QuoteModel.prototype as any, 'save').mockResolvedValue({ content: 'hello' } as any);

		await quoteCommand.execute('#canadiendragon', 'user', ['add', 'hello'], '!quote add hello' as any, { userInfo: { displayName: 'user' } } as any);

		expect(saveSpy).toHaveBeenCalled();
		expect(sayMock).toHaveBeenCalledWith('#canadiendragon', 'Quote Added to database');
		saveSpy.mockRestore();
	});

	test('list by id -> says quote when found', async () => {
		const findByIdMock = jest.spyOn(QuoteModel, 'findById').mockImplementationOnce(() => ({ exec: () => Promise.resolve({ _id: '1', content: 'hi' }) } as any));
		await quoteCommand.execute('#canadiendragon', 'user', ['list', '1'], '!quote list 1' as any, { userInfo: { displayName: 'user' } } as any);
		expect(sayMock).toHaveBeenCalledWith('#canadiendragon', '#1: "hi"');
		findByIdMock.mockRestore();
	});

	test('list random when empty -> says no quotes found', async () => {
		const countMock = jest.spyOn(QuoteModel, 'countDocuments').mockImplementationOnce(() => ({ exec: () => Promise.resolve(0) } as any));
		await quoteCommand.execute('#canadiendragon', 'user', ['list'], '!quote list' as any, { userInfo: { displayName: 'user' } } as any);
		expect(sayMock).toHaveBeenCalledWith('#canadiendragon', 'No quotes found');
		countMock.mockRestore();
	});

	test('remove non-existent id -> not found message', async () => {
		const findByIdAndDeleteMock = jest.spyOn(QuoteModel, 'findByIdAndDelete').mockImplementationOnce(() => ({ exec: () => Promise.resolve(null) } as any));
		await quoteCommand.execute('#canadiendragon', 'user', ['remove', '123'], '!quote remove 123' as any, { userInfo: { displayName: 'user' } } as any);
		expect(sayMock).toHaveBeenCalledWith('#canadiendragon', 'Quote with ID 123 not found');
		findByIdAndDeleteMock.mockRestore();
	});
});

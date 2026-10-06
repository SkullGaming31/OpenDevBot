import { createSqliteModel } from '../sqliteModel';

export interface IMarketplaceItem {
    itemId: string;
    sellerId: string;
    price: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const MarketplaceItem = createSqliteModel<IMarketplaceItem>('MarketplaceItem', {
	timestamps: true,
	unique: [['itemId']],
});
export default MarketplaceItem;

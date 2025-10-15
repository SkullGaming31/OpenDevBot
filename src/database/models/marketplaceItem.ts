import { Schema, model, Document } from 'mongoose';

export interface IMarketplaceItem extends Document {
    itemId: string;
    sellerId: string;
    price: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const marketplaceItemSchema = new Schema<IMarketplaceItem>({
	itemId: { type: String, required: true, unique: true },
	sellerId: { type: String, required: true },
	price: { type: Number, required: true },
	metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

const MarketplaceItem = model<IMarketplaceItem>('MarketplaceItem', marketplaceItemSchema);
export default MarketplaceItem;

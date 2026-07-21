// @ts-nocheck
import mongoose from 'mongoose';

async function main() {
  const mongoUri = process.env.DOCKER_URI || process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/opendevbot';
  await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB_NAME || undefined } as any);
  const BankAccount = (await import('../src/database/models/bankAccount')).default;
  const docs = await BankAccount.find({}).lean();
  console.log('BankAccount count:', docs.length);
  for (const d of docs) console.log(d.userId, typeof d.userId, d.balance, d.updatedAt);
  const numeric = await BankAccount.find({ userId: { $regex: /^\\d+$/ } }).lean();
  console.log('Numeric-keyed count:', numeric.length);
  for (const d of numeric) console.log('  numeric:', d.userId);
  console.log('\nDetailed chars:');
  for (const d of docs) {
    const s = String(d.userId);
    const codes = Array.from(s).map(ch => ch.charCodeAt(0));
    console.log(JSON.stringify(s), codes.join(','));
  }
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

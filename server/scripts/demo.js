const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../data-access/models/User');
const Item = require('../data-access/models/Item');
const Message = require('../data-access/models/Message');
const ReturnRecord = require('../data-access/models/ReturnRecord');

const browserTest = process.argv.includes('--browser-test');
const fullHandover = browserTest || process.argv.includes('--full-handover');
const frontendOrigin = browserTest ? 'http://127.0.0.1:4176' : 'http://localhost:5175';
const apiPort = browserTest ? '5004' : '5003';

// This command always creates its own database. It never loads .env or uses MONGO_URI.
const start = async () => {
  const database = await MongoMemoryReplSet.create({
    binary: { version: '8.2.6', downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') },
    replSet: { count: 1 },
  });
  const stop = async () => {
    await mongoose.disconnect();
    await database.stop();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  Object.assign(process.env, {
    DEMO_MODE: 'true', NODE_ENV: 'development', PORT: apiPort,
    DEMO_HOST: browserTest ? '127.0.0.1' : '',
    MONGO_URI: database.getUri('demo'), CLIENT_URL: frontendOrigin, CLIENT_ORIGINS: '', TRUST_PROXY_HOPS: '0',
    JWT_SECRET: 'disposable-local-demo-only-secret-01234567890123456789',
    GOOGLE_CLIENT_ID: '', GEMINI_API_KEY: '', ITEM_IDENTIFICATION_API_KEY: '',
    CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', STRIPE_SECRET_KEY: '',
  });
  await mongoose.connect(process.env.MONGO_URI);
  const ownerId = '000000000000000000000001', finderId = '000000000000000000000002';
  const password = await bcrypt.hash('LearnWithDemo2027!', 10);
  await User.create([
    { _id: ownerId, username: 'demo_owner', password },
    { _id: finderId, username: 'demo_finder', password, karmaPoints: 100 },
    { _id: '000000000000000000000003', username: 'demo_observer', password },
  ]);
  const common = { date: new Date(), province: 'Western', district: 'Colombo', city: 'Colombo', latitude: 6.9271, longitude: 79.8612, contactNumber: '0000000000' };
  await Item.create([
    { ...common, _id: '000000000000000000000101', title: 'Blue smartphone near Fort station', description: 'Synthetic demo report. A blue smartphone in a clear case, last seen near the station entrance.', type: 'LOST', category: 'Electronics', createdBy: ownerId, imageUrl: `${frontendOrigin}/demo-phone.svg`, ownershipProofs: [{ proofType: 'serialNumber', proofValue: 'DEMO-4829' }, { proofType: 'custom', customLabel: 'Receipt code', proofValue: 'DEMO-RECEIPT-42' }] },
    { ...common, _id: '000000000000000000000102', title: 'Brown wallet found in Colombo', description: 'Synthetic demo report. A brown wallet with a brass clasp found beside a bus stop.', type: 'FOUND', category: 'Wallets', createdBy: finderId, imageUrl: `${frontendOrigin}/demo-wallet.svg` },
    { ...common, _id: '000000000000000000000103', title: 'House keys with a blue tag', description: 'Synthetic demo report. Three keys on a ring with a blue identification tag.', type: 'LOST', category: 'Keys', createdBy: ownerId, imageUrl: `${frontendOrigin}/demo-keys.svg` },
  ]);
  await Message.create([
    { itemId: '000000000000000000000101', senderId: finderId, receiverId: ownerId, text: 'I found a blue phone near the station. Can you verify the serial number before we arrange a return?' },
    { itemId: '000000000000000000000101', senderId: ownerId, receiverId: finderId, text: 'Thank you. I have the receipt and can verify the private details here.' },
  ]);
  if (!fullHandover) {
    await ReturnRecord.create({ itemId: '000000000000000000000101', ownerId, finderId, status: 'OWNER_FINDER_VERIFIED', finderConfirmedAt: new Date(), ownerConfirmedAt: new Date() });
  }
  console.info(`Disposable demo API: http://${process.env.DEMO_HOST || 'localhost'}:${apiPort}`);
  console.info('Demo accounts: demo_owner, demo_finder, demo_observer. Password: LearnWithDemo2027!');
  console.info('Phone serial: DEMO-4829. Custom receipt: DEMO-RECEIPT-42. Ctrl+C stops the disposable database.');
  require('../index');
};
start().catch(error => { console.error('Demo startup failed:', error.message); process.exitCode = 1; });

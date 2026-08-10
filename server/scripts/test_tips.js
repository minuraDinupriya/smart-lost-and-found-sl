const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Item = require('../models/Item');
const ReturnRecord = require('../models/ReturnRecord');
const Tip = require('../models/Tip');
const Notification = require('../models/Notification');

// Import controllers
const tipController = require('../controllers/tip.controller');

// Helper to mock req/res
const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runTests() {
  let mongoServer;
  try {
    console.log('======================================================');
    console.log('🚀 INITIATING TIP SYSTEM AUTOMATED TEST SUITE');
    console.log('======================================================\n');

    process.stdout.write('➡️  Starting In-Memory MongoDB... ');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✅ [PASS]');

    // Setup Test Data
    process.stdout.write('➡️  Seeding Test Data... ');
    const owner = await User.create({
      username: 'test_owner',
      email: 'owner@test.com',
      password: 'password123',
      role: 'user'
    });

    const finder = await User.create({
      username: 'test_finder',
      email: 'finder@test.com',
      password: 'password123',
      role: 'user'
    });

    const otherUser = await User.create({
      username: 'test_other',
      email: 'other@test.com',
      password: 'password123',
      role: 'user'
    });

    const item = await Item.create({
      title: 'Lost Wallet',
      description: 'A black leather wallet.',
      type: 'LOST',
      category: 'Wallets',
      status: 'Claimed',
      createdBy: owner._id,
      date: new Date(),
      province: 'Western', district: 'Colombo', city: 'Colombo',
      contactNumber: '0771234567'
    });

    const returnRecord = await ReturnRecord.create({
      itemId: item._id,
      ownerId: owner._id,
      finderId: finder._id,
      status: 'Returned'
    });
    console.log('✅ [PASS]');

    // Start Tests
    console.log('\n--- Running Business Logic & Security Tests ---\n');

    const runController = async (controllerFn, req) => {
      const res = mockResponse();
      await controllerFn(req, res);
      return res;
    };

    // Test 1: Unverified user cannot tip
    process.stdout.write('Test 1: Unverified user cannot tip (Unauthorized)... ');
    let res = await runController(tipController.createTip, {
      body: { returnRecordId: returnRecord._id, amount: 250 },
      userId: otherUser._id.toString()
    });
    if (res.statusCode === 400 && res.body.message.includes('Only the rightful owner')) {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected 400 with owner restriction, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }

    // Test 2: Finder cannot tip themselves
    process.stdout.write('Test 2: Finder cannot tip themselves... ');
    const selfItem = await Item.create({
      title: 'Glasses', description: 'Test description', type: 'LOST', category: 'Wallets', status: 'Claimed',
      createdBy: finder._id, date: new Date(), province: 'Western', district: 'Colombo', city: 'Colombo',
      contactNumber: '0771234567'
    });
    const selfReturnRecord = await ReturnRecord.create({
      itemId: selfItem._id, ownerId: finder._id, finderId: finder._id, status: 'Returned'
    });
    res = await runController(tipController.createTip, {
      body: { returnRecordId: selfReturnRecord._id, amount: 250 },
      userId: finder._id.toString()
    });
    if (res.statusCode === 400 && res.body.message.includes('cannot give a tip to yourself')) {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected failure for tipping self, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }

    // Test 3: Owner cannot tip before handover is completed/claimed
    process.stdout.write('Test 3: Owner cannot tip before handover... ');
    const pendingItem = await Item.create({
      title: 'Keys', description: 'Test description', type: 'LOST', category: 'Wallets', status: 'Pending Verification',
      createdBy: owner._id, date: new Date(), province: 'Western', district: 'Colombo', city: 'Colombo',
      contactNumber: '0771234567'
    });
    const pendingReturn = await ReturnRecord.create({
      itemId: pendingItem._id, ownerId: owner._id, finderId: finder._id, status: 'Returned'
    });
    res = await runController(tipController.createTip, {
      body: { returnRecordId: pendingReturn._id, amount: 250 },
      userId: owner._id.toString()
    });
    if (res.statusCode === 400 && res.body.message.includes('not been marked as Claimed')) {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected failure for pending handover, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }

    // Test 4: Negative or zero amount is rejected
    process.stdout.write('Test 4: Negative/Zero amount is rejected... ');
    res = await runController(tipController.createTip, {
      body: { returnRecordId: returnRecord._id, amount: 0 },
      userId: owner._id.toString()
    });
    if (res.statusCode === 400 && res.body.message.includes('Amount must be greater than zero')) {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected failure for zero amount, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }

    // Test 5: Verified owner can give tip after successful handover (Success Flow)
    process.stdout.write('Test 5: Verified owner successfully initiates tip... ');
    res = await runController(tipController.createTip, {
      body: { returnRecordId: returnRecord._id, amount: 500, thankYouMessage: 'Thanks!' },
      userId: owner._id.toString(),
      headers: { origin: 'http://localhost:5173' }
    });
    if (res.statusCode === 200 && res.body.checkoutUrl) {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected success, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }
    
    // Simulate successful payment completion
    const tip = res.body.tip;
    
    // Test 6: Payment completion marks tip as paid and notifies finder
    process.stdout.write('Test 6: Successful payment flow... ');
    res = await runController(tipController.updateTipPaymentStatus, {
      body: { paymentReference: tip.paymentReference },
      userId: 'system' // System call
    });
    if (res.statusCode === 200 && res.body.tip.paymentStatus === 'paid') {
      const finderNotif = await Notification.findOne({ userId: finder._id, type: 'TIP_RECEIVED' });
      if (finderNotif) {
        console.log('✅ [PASS] - Notified Finder');
      } else {
        throw new Error('Finder was not notified!');
      }
    } else {
      throw new Error(`Expected payment verification success, got ${res.statusCode}`);
    }

    // Test 7: Duplicate tip is rejected
    process.stdout.write('Test 7: Duplicate tip is rejected... ');
    res = await runController(tipController.createTip, {
      body: { returnRecordId: returnRecord._id, amount: 250 },
      userId: owner._id.toString()
    });
    if (res.statusCode === 400 && res.body.message.includes('has already been paid')) {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected failure for duplicate tip, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }

    // Test 8: Skip Tip creates a skipped record with 0 amount
    process.stdout.write('Test 8: Skipping tip creates skipped status... ');
    const skipItem = await Item.create({
      title: 'Bag', description: 'Test description', type: 'LOST', category: 'Wallets', status: 'Claimed',
      createdBy: owner._id, date: new Date(), province: 'Western', district: 'Colombo', city: 'Colombo',
      contactNumber: '0771234567'
    });
    const skipReturn = await ReturnRecord.create({
      itemId: skipItem._id, ownerId: owner._id, finderId: finder._id, status: 'Completed'
    });
    res = await runController(tipController.skipTip, {
      body: { returnRecordId: skipReturn._id },
      userId: owner._id.toString()
    });
    if (res.statusCode === 200 && res.body.tip.paymentStatus === 'skipped') {
      console.log('✅ [PASS]');
    } else {
      throw new Error(`Expected skipped status, got ${res.statusCode} - ${JSON.stringify(res.body)}`);
    }

    console.log('\n======================================================');
    console.log('🛡️  ALL 8 COMPREHENSIVE TIP TESTS PASSED FLAWLESSLY!');
    console.log('======================================================\n');

    await mongoose.connection.close();
    await mongoServer.stop();
    process.exit(0);
  } catch (error) {
    console.log('❌ [FAIL]');
    console.error('\n⚠️ TEST SUITE ENCOUNTERED A FATAL ERROR:');
    console.error(error.message);
    if (mongoServer) {
      await mongoose.connection.close();
      await mongoServer.stop();
    }
    process.exit(1);
  }
}

runTests();

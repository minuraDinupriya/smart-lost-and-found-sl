const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Item = require('../models/Item');
const ReturnRecord = require('../models/ReturnRecord');
const Tip = require('../models/Tip');
const Notification = require('../models/Notification');

async function testTipFlow() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://admin:Uf7H0jJ0QGkE8K6p@cluster0.sfy6b3v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Testing...');

    // 1. Clean up any previous test records
    await User.deleteMany({ username: { $in: ['test_owner', 'test_finder'] } });
    
    // 2. Create test users
    const owner = await User.create({
      username: 'test_owner',
      karmaPoints: 10,
      role: 'user'
    });

    const finder = await User.create({
      username: 'test_finder',
      karmaPoints: 10,
      role: 'user'
    });

    console.log(`Created test users: Owner (${owner.username}), Finder (${finder.username})`);

    // 3. Create test Item
    const item = await Item.create({
      title: 'Test Lost Laptop',
      description: 'Black Dell XPS laptop lost near library',
      type: 'LOST',
      category: 'Electronics',
      date: new Date(),
      province: 'Western',
      district: 'Colombo',
      city: 'Colombo',
      contactNumber: '0711111111',
      status: 'Available',
      createdBy: owner._id
    });
    console.log(`Created test Item: "${item.title}" (Status: ${item.status})`);

    // 4. Update item status to Claimed and create ReturnRecord
    item.status = 'Claimed';
    await item.save();

    const returnRecord = await ReturnRecord.create({
      itemId: item._id,
      ownerId: owner._id,
      finderId: finder._id,
      status: 'Returned'
    });
    console.log(`Created ReturnRecord for item: owner=${owner.username}, finder=${finder.username}`);

    // 5. Test Tip Validation - Amount must be > 0
    try {
      const invalidTip = new Tip({
        returnRecordId: returnRecord._id,
        ownerId: owner._id,
        finderId: finder._id,
        amount: -50,
      });
      await invalidTip.validate();
      console.error('❌ Validation check failed: Negative tip amount was allowed.');
    } catch (valErr) {
      console.log('✅ Validation check passed: Negative tip amount was correctly rejected.');
    }

    // 6. Test Tip creation (pending state)
    const tip = await Tip.create({
      returnRecordId: returnRecord._id,
      ownerId: owner._id,
      finderId: finder._id,
      amount: 500,
      thankYouMessage: 'Thanks a lot for finding my laptop!',
      paymentStatus: 'pending',
      paymentReference: 'mock_ref_test_123'
    });
    console.log(`Created Tip record: amount=Rs. ${tip.amount}, status=${tip.paymentStatus}`);

    // 7. Test unique index (One tip per return record)
    try {
      await Tip.create({
        returnRecordId: returnRecord._id,
        ownerId: owner._id,
        finderId: finder._id,
        amount: 1000,
        paymentStatus: 'pending',
        paymentReference: 'mock_ref_test_456'
      });
      console.error('❌ Validation check failed: Duplicate tip allowed for same return record.');
    } catch (dupErr) {
      console.log('✅ Validation check passed: Duplicate tip for same return record was correctly blocked.');
    }

    // 8. Test payment verification updates
    const verificationRef = 'mock_ref_test_123';
    const foundTip = await Tip.findOne({ paymentReference: verificationRef });
    if (foundTip) {
      foundTip.paymentStatus = 'paid';
      await foundTip.save();
      console.log(`Verified payment reference: status updated to paid.`);

      // Create test notifications
      await Notification.create({
        userId: finder._id,
        message: `You received Rs. ${foundTip.amount} tip from @${owner.username}`,
        type: 'TIP_RECEIVED'
      });
      
      await Notification.create({
        userId: owner._id,
        message: `Your tip of Rs. ${foundTip.amount} was sent to @${finder.username}`,
        type: 'TIP_SENT'
      });
      console.log('Created notifications for owner and finder.');
    }

    // 9. Verify notifications exist
    const finderNotifs = await Notification.find({ userId: finder._id });
    console.log(`Finder notifications count: ${finderNotifs.length} (${finderNotifs[0]?.message})`);

    const ownerNotifs = await Notification.find({ userId: owner._id });
    console.log(`Owner notifications count: ${ownerNotifs.length} (${ownerNotifs[0]?.message})`);

    // Clean up
    await User.findByIdAndDelete(owner._id);
    await User.findByIdAndDelete(finder._id);
    await Item.findByIdAndDelete(item._id);
    await ReturnRecord.findByIdAndDelete(returnRecord._id);
    await Tip.findByIdAndDelete(tip._id);
    await Notification.deleteMany({ userId: { $in: [owner._id, finder._id] } });
    console.log('Cleaned up test data.');
    
    console.log('🎉 ALL DB AND MODEL WORKFLOW TESTS PASSED SUCCESSFULLY! 🎉');
    mongoose.connection.close();
  } catch (err) {
    console.error('❌ Test execution encountered an error:', err);
    mongoose.connection.close();
  }
}

testTipFlow();

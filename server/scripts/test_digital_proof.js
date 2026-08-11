require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Item = require('../models/Item');

async function runTests() {
  console.log('\n======================================================');
  console.log('🛡️  TESTING DIGITAL PROOF OF OWNERSHIP FEATURE');
  console.log('======================================================\n');

  try {
    // 1. Database Connection
    process.stdout.write('➡️  Connecting to Database... ');
    await connectDB();
    console.log('✅ [PASS]');

    // 2. Clear previous test data (safely for test users)
    const testUsername = 'proof_tester_user';
    let testUser = await User.findOne({ username: testUsername });
    if (!testUser) {
      testUser = await User.create({
        username: testUsername,
        email: 'tester@proof.com',
        role: 'user'
      });
    }

    // 3. Test Item Creation with Private Ownership Proofs
    process.stdout.write('➡️  Testing Item Creation with Ownership Proofs... ');
    const testItem = await Item.create({
      title: 'Test Owner Smartphone',
      description: 'A beautiful blue smartphone with engraving on the back',
      type: 'LOST',
      category: 'Electronics',
      date: new Date(),
      province: 'Western',
      district: 'Colombo',
      city: 'Colombo 03',
      contactNumber: '0712345678',
      createdBy: testUser._id,
      ownershipProofs: [
        {
          proofType: 'serialNumber',
          proofValue: 'SN-9876-XYZ'
        },
        {
          proofType: 'imei',
          proofValue: '3589-1234-5678-901'
        },
        {
          proofType: 'engraving',
          proofValue: 'To my dearest friend, love Mom'
        },
        {
          proofType: 'custom',
          customLabel: 'Special Mark',
          proofValue: 'Golden star sticker under the phone case'
        }
      ]
    });
    console.log('✅ [PASS]');

    // 4. Test Comparison Logic manually
    process.stdout.write('➡️  Testing Normalization and Similarity Matcher... ');
    const stringSimilarity = require('string-similarity');

    const compareValues = (val1, val2) => {
      if (!val1 || !val2) return 0;
      const norm1 = val1.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const norm2 = val2.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (norm1 === norm2 && norm1.length > 0) return 1.0;
      if (norm1.length >= 6 && norm2.length >= 6) {
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
          return 0.9;
        }
      }
      return stringSimilarity.compareTwoStrings(val1.toLowerCase().trim(), val2.toLowerCase().trim());
    };

    // Submitting exact, typo-laden, and wrong values to verify robustness
    const submissions = [
      { type: 'serialNumber', val: 'sn-9876-xyz', expectedMatch: true }, // exact case-insensitive match
      { type: 'imei', val: '358912345678901', expectedMatch: true },      // spaces/dashes removed match
      { type: 'engraving', val: 'To my dearest friend, Love MOM', expectedMatch: true }, // slight casing difference match
      { type: 'custom', label: 'Special Mark', val: 'golden star sticker', expectedMatch: true }, // substring/similar match
      { type: 'serialNumber', val: 'wrong-serial', expectedMatch: false } // completely wrong
    ];

    for (const sub of submissions) {
      const stored = testItem.ownershipProofs.find(p => 
        p.proofType === sub.type && (sub.type !== 'custom' || p.customLabel === sub.label)
      );
      if (!stored) throw new Error(`Stored proof not found for ${sub.type}`);
      const score = compareValues(stored.proofValue, sub.val);
      const matched = score >= 0.8;
      if (matched !== sub.expectedMatch) {
        throw new Error(`Match failure on ${sub.type}. Score: ${score}, Matched: ${matched}, Expected: ${sub.expectedMatch}`);
      }
    }
    console.log('✅ [PASS]');

    // 5. Clean up test data
    process.stdout.write('➡️  Cleaning up database test artifacts... ');
    await Item.deleteOne({ _id: testItem._id });
    console.log('✅ [PASS]');

    console.log('\n======================================================');
    console.log('🎉 ALL DIGITAL PROOF UNIT & INTEGRATION TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.log('❌ [FAIL]');
    console.error('\n⚠️ TEST SUITE FAILED:');
    console.error(error);
    process.exit(1);
  }
}

runTests();

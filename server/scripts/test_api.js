require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const connectDB = require('../config/db');

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 INITIATING AUTOMATED API INTEGRATION SUITE');
  console.log('======================================================\n');
  
  try {
    const API_BASE = 'http://localhost:5000/api';
    
    // 1. Establish direct database link to gather live test context
    process.stdout.write('➡️  Connecting to Database... ');
    await connectDB();
    const user = await User.findOne({ username: 'system_tester' });
    const item = await Item.findOne({ createdBy: user._id });
    console.log('✅ [PASS]');

    // 2. Synthesize JWT Auth Token to simulate a live secure session
    process.stdout.write('➡️  Synthesizing Security Tokens... ');
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_usjp_lost_and_found_dev';
    const token = jwt.sign({ id: user._id, userId: user._id }, secret);
    console.log('✅ [PASS]');

    // 3. Test Dashboard Payload Endpoint
    process.stdout.write('➡️  Testing GET /api/items (Dashboard Data)... ');
    const itemsRes = await fetch(`${API_BASE}/items`);
    if (!itemsRes.ok) throw new Error(`Status ${itemsRes.status}`);
    const itemsData = await itemsRes.json();
    if (!itemsData.length) throw new Error("Dashboard payload empty");
    console.log(`✅ [PASS] - Pulled ${itemsData.length} records.`);

    // 4. Test Single Item Fetch (The fix for the Chat Bug)
    process.stdout.write(`➡️  Testing GET /api/items/${item._id} (Receiver ID Fetch)... `);
    const singleItemRes = await fetch(`${API_BASE}/items/${item._id}`);
    if (!singleItemRes.ok) throw new Error(`Status ${singleItemRes.status}`);
    const singleItemData = await singleItemRes.json();
    if (!singleItemData.createdBy || !singleItemData.createdBy._id) {
      throw new Error("Item controller failed to populate createdBy ObjectId!");
    }
    console.log(`✅ [PASS] - Extracted Receiver ID: ${singleItemData.createdBy._id}`);

    // 5. Test Chat Log Retrieval Pipeline
    process.stdout.write(`➡️  Testing GET /api/messages/${item._id} (Secure Chat Logs)... `);
    const msgRes = await fetch(`${API_BASE}/messages/${item._id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!msgRes.ok) throw new Error(`Status ${msgRes.status}`);
    const msgData = await msgRes.json();
    console.log(`✅ [PASS] - Fetched array of ${msgData.length} persisted messages.`);

    // 6. Test Police PDF Generation Stream
    process.stdout.write(`➡️  Testing GET /api/items/${item._id}/download-pdf (pdfkit Engine)... `);
    const pdfRes = await fetch(`${API_BASE}/items/${item._id}/download-pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!pdfRes.ok) throw new Error(`Status ${pdfRes.status}`);
    
    // Verify it streams a valid application/pdf Blob
    const contentType = pdfRes.headers.get('content-type');
    if (!contentType.includes('application/pdf')) throw new Error("Engine returned non-PDF format!");
    const pdfBlob = await pdfRes.blob();
    console.log(`✅ [PASS] - Directly piped PDF document (${pdfBlob.size} bytes).`);

    console.log('\n======================================================');
    console.log('🛡️  ALL CORE INTEGRATION TESTS PASSED FLAWLESSLY!');
    console.log('======================================================\n');
    process.exit(0);

  } catch (error) {
    console.log('❌ [FAIL]');
    console.error('\n⚠️ TEST SUITE ENCOUNTERED A FATAL ERROR:');
    console.error(error.message);
    process.exit(1);
  }
}

runTests();

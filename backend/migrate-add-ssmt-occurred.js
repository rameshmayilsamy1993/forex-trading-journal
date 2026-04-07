/**
 * Migration Script: Add ssmtOccurred field to existing trades
 * 
 * Usage: 
 *   node migrate-add-ssmt-occurred.js
 * 
 * This script adds the ssmtOccurred field to all existing trades
 * and sets it to false by default.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function migrate() {
  try {
    console.log('=== SSMT Occurred Migration ===\n');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get the trades collection
    const tradesCollection = db.collection('trades');
    
    // Count trades with ssmtOccurred field
    const withField = await tradesCollection.countDocuments({ ssmtOccurred: { $exists: true } });
    const withoutField = await tradesCollection.countDocuments({ ssmtOccurred: { $exists: false } });
    
    console.log(`Trades with ssmtOccurred field: ${withField}`);
    console.log(`Trades without ssmtOccurred field: ${withoutField}`);
    
    if (withoutField === 0) {
      console.log('\nAll trades already have ssmtOccurred field. Nothing to migrate.');
    } else {
      // Update all trades without ssmtOccurred to have it set to false
      console.log(`\nUpdating ${withoutField} trades to set ssmtOccurred = false...`);
      
      const result = await tradesCollection.updateMany(
        { ssmtOccurred: { $exists: false } },
        { $set: { ssmtOccurred: false } }
      );
      
      console.log(`Modified ${result.modifiedCount} trades`);
      console.log(`Matched ${result.matchedCount} trades`);
    }
    
    // Verify migration
    console.log('\n--- Migration Verification ---');
    const finalWithField = await tradesCollection.countDocuments({ ssmtOccurred: { $exists: true } });
    const finalWithoutField = await tradesCollection.countDocuments({ ssmtOccurred: { $exists: false } });
    
    console.log(`Trades with ssmtOccurred field: ${finalWithField}`);
    console.log(`Trades without ssmtOccurred field: ${finalWithoutField}`);
    
    // Show sample of migrated trades
    console.log('\n--- Sample Migrated Trades ---');
    const samples = await tradesCollection.find({}).limit(3).toArray();
    samples.forEach((trade, i) => {
      console.log(`\nTrade ${i + 1}:`);
      console.log(`  ID: ${trade._id}`);
      console.log(`  Pair: ${trade.pair}`);
      console.log(`  ssmtOccurred: ${trade.ssmtOccurred}`);
    });
    
    console.log('\n=== Migration Complete ===');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
    process.exit(0);
  }
}

migrate();

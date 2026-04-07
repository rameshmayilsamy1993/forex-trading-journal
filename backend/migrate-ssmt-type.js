/**
 * Migration Script: Update ssmtOccurred to ssmtType enum
 * 
 * Usage: 
 *   node migrate-ssmt-type.js
 * 
 * This script:
 * 1. Renames ssmtOccurred to ssmtType
 * 2. Converts boolean values to enum:
 *    - true -> "GBPUSD" (or could default to "NO")
 *    - false -> "NO"
 * 3. Sets default "NO" for missing values
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const SSMT_TYPES = ['NO', 'GBPUSD', 'EURUSD', 'DXY'];

async function migrate() {
  try {
    console.log('=== SSMT Type Migration ===\n');
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get the trades collection
    const tradesCollection = db.collection('trades');
    const missedTradesCollection = db.collection('missedtrades');
    
    // Step 1: Update trades collection
    console.log('--- Migrating trades collection ---\n');
    
    const tradesWithOldField = await tradesCollection.countDocuments({ ssmtOccurred: { $exists: true } });
    const tradesWithNewField = await tradesCollection.countDocuments({ ssmtType: { $exists: true } });
    const tradesWithoutField = await tradesCollection.countDocuments({ 
      ssmtOccurred: { $exists: false }, 
      ssmtType: { $exists: false } 
    });
    
    console.log(`Trades with ssmtOccurred (old): ${tradesWithOldField}`);
    console.log(`Trades with ssmtType (new): ${tradesWithNewField}`);
    console.log(`Trades without field: ${tradesWithoutField}`);
    
    // Migrate trades with old boolean field
    if (tradesWithOldField > 0) {
      console.log(`\nMigrating ${tradesWithOldField} trades from ssmtOccurred to ssmtType...`);
      
      const result = await tradesCollection.updateMany(
        { ssmtOccurred: { $exists: true } },
        [
          {
            $set: {
              ssmtType: {
                $cond: {
                  if: { $eq: ['$ssmtOccurred', true] },
                  then: 'GBPUSD', // Convert true to GBPUSD (or could be another pair)
                  else: 'NO'
                }
              }
            }
          }
        ]
      );
      
      console.log(`Migrated ${result.modifiedCount} trades`);
      
      // Remove old field
      await tradesCollection.updateMany(
        { ssmtOccurred: { $exists: true } },
        { $unset: { ssmtOccurred: '' } }
      );
      console.log('Removed ssmtOccurred field from trades');
    }
    
    // Set default for trades without field
    if (tradesWithoutField > 0 || !tradesWithNewField) {
      const tradesNeedDefault = await tradesCollection.countDocuments({ ssmtType: { $exists: false } });
      if (tradesNeedDefault > 0) {
        console.log(`\nSetting ssmtType = 'NO' for ${tradesNeedDefault} trades without field...`);
        await tradesCollection.updateMany(
          { ssmtType: { $exists: false } },
          { $set: { ssmtType: 'NO' } }
        );
        console.log('Updated default values');
      }
    }
    
    // Step 2: Update missed_trades collection
    console.log('\n--- Migrating missed_trades collection ---\n');
    
    const missedWithOldField = await missedTradesCollection.countDocuments({ ssmtOccurred: { $exists: true } });
    const missedWithNewField = await missedTradesCollection.countDocuments({ ssmtType: { $exists: true } });
    const missedWithoutField = await missedTradesCollection.countDocuments({ 
      ssmtOccurred: { $exists: false }, 
      ssmtType: { $exists: false } 
    });
    
    console.log(`Missed trades with ssmtOccurred (old): ${missedWithOldField}`);
    console.log(`Missed trades with ssmtType (new): ${missedWithNewField}`);
    console.log(`Missed trades without field: ${missedWithoutField}`);
    
    // Migrate missed trades with old boolean field
    if (missedWithOldField > 0) {
      console.log(`\nMigrating ${missedWithOldField} missed trades from ssmtOccurred to ssmtType...`);
      
      const result = await missedTradesCollection.updateMany(
        { ssmtOccurred: { $exists: true } },
        [
          {
            $set: {
              ssmtType: {
                $cond: {
                  if: { $eq: ['$ssmtOccurred', true] },
                  then: 'GBPUSD',
                  else: 'NO'
                }
              }
            }
          }
        ]
      );
      
      console.log(`Migrated ${result.modifiedCount} missed trades`);
      
      // Remove old field
      await missedTradesCollection.updateMany(
        { ssmtOccurred: { $exists: true } },
        { $unset: { ssmtOccurred: '' } }
      );
      console.log('Removed ssmtOccurred field from missed_trades');
    }
    
    // Set default for missed trades without field
    const missedNeedDefault = await missedTradesCollection.countDocuments({ ssmtType: { $exists: false } });
    if (missedNeedDefault > 0) {
      console.log(`\nSetting ssmtType = 'NO' for ${missedNeedDefault} missed trades without field...`);
      await missedTradesCollection.updateMany(
        { ssmtType: { $exists: false } },
        { $set: { ssmtType: 'NO' } }
      );
      console.log('Updated default values');
    }
    
    // Verification
    console.log('\n--- Migration Verification ---\n');
    
    const finalTradesCount = await tradesCollection.countDocuments({ ssmtType: { $exists: true } });
    const finalMissedCount = await missedTradesCollection.countDocuments({ ssmtType: { $exists: true } });
    
    console.log(`Trades with ssmtType: ${finalTradesCount}`);
    console.log(`Missed trades with ssmtType: ${finalMissedCount}`);
    
    // Show sample
    console.log('\n--- Sample Trades ---\n');
    const tradeSamples = await tradesCollection.find({}).limit(3).toArray();
    tradeSamples.forEach((trade, i) => {
      console.log(`Trade ${i + 1}: pair=${trade.pair}, ssmtType=${trade.ssmtType}`);
    });
    
    console.log('\n=== Migration Complete ===');
    console.log('\nAllowed SSMT Types:', SSMT_TYPES.join(', '));
    
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

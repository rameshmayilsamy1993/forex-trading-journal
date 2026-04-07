// MongoDB cleanup script for double-encoded HTML in missedReason field
// Run with: node cleanup-missed-reason.js

require('dotenv').config();
const mongoose = require('mongoose');

const missedTradeSchema = new mongoose.Schema({
  missedReason: String,
  reason: String
}, { collection: 'missed_trades' });

const MissedTrade = mongoose.model('MissedTrade', missedTradeSchema);

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const docs = await MissedTrade.find({});
    console.log(`Found ${docs.length} missed trades`);

    let fixedCount = 0;

    for (const doc of docs) {
      let needsUpdate = false;
      const updates = {};

      // Check and fix missedReason
      if (doc.missedReason && doc.missedReason.includes('&lt;')) {
        const decoded = doc.missedReason
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        updates.missedReason = decoded;
        needsUpdate = true;
      }

      // Check and fix reason
      if (doc.reason && doc.reason.includes('&lt;')) {
        const decoded = doc.reason
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        updates.reason = decoded;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await MissedTrade.updateOne({ _id: doc._id }, { $set: updates });
        fixedCount++;
        console.log(`Fixed document: ${doc._id}`);
      }
    }

    console.log(`\nCleanup complete! Fixed ${fixedCount} documents.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();

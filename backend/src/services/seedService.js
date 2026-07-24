const Master = require('../modules/masters/master.model');

const seedMasters = async (userId) => {
  try {
    const count = await Master.countDocuments({ userId });
    if (count === 0) {
      const strategies = [
        {
          name: 'HTF CRT + LTF MODEL #1',
          checklist: [
            { label: 'HTF Trend Confirmed', required: true, order: 1 },
            { label: 'HTF Supply/Demand Zone', required: true, order: 2 },
            { label: 'HTF Indecision Candle', required: false, order: 3 },
            { label: 'LTF FVG Detected', required: true, order: 4 },
            { label: 'LTF Retest Complete', required: true, order: 5 },
            { label: 'Liquidity Sweep Occurred', required: false, order: 6 },
            { label: 'SSMT/MTD Confirmation', required: false, order: 7 },
            { label: 'No Major News', required: true, order: 8 },
            { label: 'Risk/Reward > 2:1', required: true, order: 9 }
          ]
        },
        {
          name: 'HTF FVG + LTF',
          checklist: [
            { label: 'HTF FVG Identified', required: true, order: 1 },
            { label: 'HTF Trend Direction', required: true, order: 2 },
            { label: 'LTF Entry Zone', required: true, order: 3 },
            { label: 'Liquidity Levels', required: false, order: 4 },
            { label: 'No News Event', required: true, order: 5 }
          ]
        }
      ];
      const keyLevels = ['HTF FVG', 'HTF IFVG', 'HTF OB', 'HTF HIGHLOW'];
      const sessions = ['ASIAN', 'LONDON', 'NEW YORK', 'OVERLAP'];

      const masters = [
        ...strategies.map(s => ({ name: s.name, type: 'strategy', userId, checklist: s.checklist })),
        ...keyLevels.map(name => ({ name, type: 'keyLevel', userId })),
        ...sessions.map(name => ({ name, type: 'session', userId }))
      ];

      await Master.insertMany(masters);
      console.log('Master data seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding master data:', error);
  }
};

module.exports = { seedMasters };

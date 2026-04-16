const Master = require('../modules/masters/master.model');

const seedMasters = async (userId) => {
  try {
    const count = await Master.countDocuments({ userId });
    if (count === 0) {
      const strategies = ['4HR CRT + 15MIN MODEL #1', '4HR FVG + 15MIN'];
      const keyLevels = ['4HR FVG', '4HR IFVG', '4HR OB', '4HR HIGHLOW'];
      const sessions = ['ASIAN', 'LONDON', 'NEW YORK', 'OVERLAP'];

      const masters = [
        ...strategies.map(name => ({ name, type: 'strategy', userId })),
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

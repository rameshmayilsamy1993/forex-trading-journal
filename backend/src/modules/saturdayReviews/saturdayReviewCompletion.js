const eventField = (eventType, key, condition) => {
  const field = { source: 'event', eventType, key };
  if (condition) field.condition = condition;
  return field;
};

const COMPLETION_FIELDS = [
  { source: 'review', key: 'pair' },
  { source: 'review', key: 'weekStart' },
  { source: 'review', key: 'overallBias' },
  { source: 'review', key: 'reviewDate' },
  eventField('weekly_high', 'day'),
  eventField('weekly_high', 'date'),
  eventField('weekly_high', 'time'),
  eventField('weekly_low', 'day'),
  eventField('weekly_low', 'date'),
  eventField('weekly_low', 'time'),
  { source: 'review', key: 'candleType' },
  { source: 'review', key: 'highOrLowFirst' },
  { source: 'review', key: 'expansionDirection' },
  eventField('weekly_high_origin', 'category'),
  eventField('weekly_high_origin', 'keyLevel'),
  eventField('weekly_low_origin', 'category'),
  eventField('weekly_low_origin', 'keyLevel'),
  { source: 'review', key: 'oteTouched' },
  { source: 'review', key: 'weeklyStory', nonEmpty: true },
  { source: 'review', key: 'oteDirection', condition: (r) => r.oteTouched === 'Yes' },
  { source: 'review', key: 'oteReaction', condition: (r) => r.oteTouched === 'Yes' },
  eventField('ote', 'day', (r) => r.oteTouched === 'Yes'),
  eventField('ote', 'time', (r) => r.oteTouched === 'Yes'),
];

function isFilled(value, field) {
  if (field.nonEmpty) {
    const text = String(value || '').replace(/<[^>]*>/g, '').trim();
    return text.length > 0;
  }
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function computeCompletion(review, events) {
  const eventsByType = {};
  for (const event of events || []) {
    eventsByType[event.eventType] = event;
  }
  let filled = 0;
  let total = 0;
  for (const field of COMPLETION_FIELDS) {
    if (field.condition && !field.condition(review)) continue;
    total += 1;
    const value = field.source === 'event'
      ? eventsByType[field.eventType]?.[field.key]
      : review[field.key];
    if (isFilled(value, field)) filled += 1;
  }
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { percent, complete: filled === total, filled, total };
}

module.exports = { computeCompletion, COMPLETION_FIELDS };

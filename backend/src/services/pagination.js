const mongoose = require('mongoose');

async function paginate(model, query, cursor, limit = 20, options = {}) {
  const effectiveLimit = Math.min(limit, 100);
  const sort = options.sort || { _id: 1 };
  const paginatedQuery = cursor
    ? { ...query, _id: { $gt: new mongoose.Types.ObjectId(cursor) } }
    : { ...query };

  let queryBuilder = model.find(paginatedQuery).sort(sort).limit(effectiveLimit + 1);
  if (options.populate) queryBuilder = queryBuilder.populate(options.populate);

  const items = await queryBuilder;
  const hasMore = items.length > effectiveLimit;
  if (hasMore) items.pop();

  const lastItem = items[items.length - 1];
  return {
    data: items,
    nextCursor: hasMore && lastItem ? lastItem._id.toString() : null,
    hasMore,
  };
}

module.exports = { paginate };

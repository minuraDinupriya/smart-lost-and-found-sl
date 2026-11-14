const { validateProofs } = require('../../utils/ownershipProofs');

class ItemInputError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const isItemId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

const browseCategories = ['Electronics', 'Documents', 'Keys', 'Bags', 'Wallets', 'Pets', 'Others'];

const readQueryText = (query, field, limit) => {
  const value = query[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > limit || value.includes('\0') || !value.isWellFormed()) {
    throw new ItemInputError(`Invalid ${field}.`);
  }
  return value.trim() || undefined;
};

const readQueryInteger = (query, field, fallback, max) => {
  const value = query[field];
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > 16 || !/^[1-9][0-9]*$/.test(value)) {
    throw new ItemInputError(`Invalid ${field}.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > max) {
    throw new ItemInputError(`Invalid ${field}.`);
  }
  return number;
};

const readBrowseFilters = query => {
  const filters = {
    q: readQueryText(query, 'q', 120),
    province: readQueryText(query, 'province', 100),
    district: readQueryText(query, 'district', 100),
    city: readQueryText(query, 'city', 100),
    type: readQueryText(query, 'type', 5),
    category: readQueryText(query, 'category', 20),
  };
  if (filters.type && !['LOST', 'FOUND'].includes(filters.type)) throw new ItemInputError('Invalid type.');
  if (filters.category && !browseCategories.includes(filters.category)) throw new ItemInputError('Invalid category.');
  if (query.mine !== undefined && query.mine !== 'true') throw new ItemInputError('Invalid mine filter.');
  return { ...filters, mine: query.mine === 'true' };
};

const readBrowsePage = query => {
  const highlight = query.highlight;
  if (highlight !== undefined && !isItemId(highlight)) throw new ItemInputError('Invalid highlight.');
  return {
    page: readQueryInteger(query, 'page', 1, Number.MAX_SAFE_INTEGER),
    pageSize: readQueryInteger(query, 'pageSize', 12, 48),
    highlight,
  };
};

const textFields = [
  'title', 'description', 'type', 'category', 'color', 'brand', 'model', 'date',
  'province', 'district', 'city', 'contactNumber', 'securityQuestion', 'policeStationName',
];

const readReport = (body, { creating = false } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ItemInputError('Invalid item data.');
  const data = { ...body };
  for (const field of textFields) {
    if (Object.hasOwn(data, field) && typeof data[field] !== 'string') {
      throw new ItemInputError(`Invalid ${field}.`);
    }
  }
  for (const field of ['aiIdentified', 'handedToPolice']) {
    if (Object.hasOwn(data, field) && ![true, false, 'true', 'false'].includes(data[field])) {
      throw new ItemInputError(`Invalid ${field}.`);
    }
  }
  for (const [field, limit] of [['latitude', 90], ['longitude', 180]]) {
    if (Object.hasOwn(data, field) && !isCoordinate(data[field], limit)) {
      throw new ItemInputError(`Invalid ${field}.`);
    }
  }
  if (Object.hasOwn(data, 'ownershipProofs')) {
    if (typeof data.ownershipProofs === 'string') {
      try {
        data.ownershipProofs = JSON.parse(data.ownershipProofs);
      } catch {
        throw new ItemInputError('Invalid ownership proofs JSON.');
      }
    }
    if (!Array.isArray(data.ownershipProofs) || (data.ownershipProofs.length && !validateProofs(data.ownershipProofs))) {
      throw new ItemInputError('Invalid ownership proofs.');
    }
  } else if (creating) {
    data.ownershipProofs = [];
  }

  if (typeof data.aiIdentification === 'string') {
    try {
      data.aiIdentification = JSON.parse(data.aiIdentification);
    } catch {
      if (!creating) throw new ItemInputError('Invalid AI identification JSON.');
      delete data.aiIdentification;
    }
  }
  if (data.aiIdentification != null && (typeof data.aiIdentification !== 'object' || Array.isArray(data.aiIdentification))) {
    throw new ItemInputError('Invalid AI identification.');
  }
  return data;
};

const isCoordinate = (value, limit) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return false;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit;
};

module.exports = { ItemInputError, isItemId, readReport, isCoordinate, readBrowseFilters, readBrowsePage };

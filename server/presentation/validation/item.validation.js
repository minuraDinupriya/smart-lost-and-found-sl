const { validateProofs } = require('../../utils/ownershipProofs');

class ItemInputError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const isItemId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

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

module.exports = { ItemInputError, isItemId, readReport, isCoordinate };

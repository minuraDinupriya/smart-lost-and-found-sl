const { findOwnerReturns, findFinderReturns } = require('../../data-access/repositories/history.repository');
const { findTipsByReturnRecordIds } = require('../../data-access/repositories/tip.repository');

const withTips = async records => {
  if (!records.length) return records;

  const tips = await findTipsByReturnRecordIds(records.map(record => record._id));
  const tipsByReturnId = new Map(tips.map(tip => [tip.returnRecordId.toString(), tip]));
  return records.map(record => ({ ...record, tip: tipsByReturnId.get(record._id.toString()) || null }));
};

const getOwnerHistory = async userId => withTips(await findOwnerReturns(userId));
const getFinderHistory = async userId => withTips(await findFinderReturns(userId));

module.exports = { getOwnerHistory, getFinderHistory };

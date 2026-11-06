const { compareTwoStrings } = require('string-similarity');
const normalizeType = value => value.normalize('NFKC').trim().toLowerCase().replace(/[\s_-]+/g, '');
const normalizeValue = value => value.normalize('NFKC').trim().toLowerCase();
const descriptiveTypes = new Set(['description', 'physicalmark', 'uniquemark', 'specialfeature', 'engraving']);

const validateProofs = proofs => Array.isArray(proofs) && proofs.length > 0 && proofs.length <= 20 && proofs.every(proof =>
  proof && typeof proof === 'object' && !Array.isArray(proof) &&
  typeof proof.proofType === 'string' && proof.proofType.trim().length > 0 && proof.proofType.length <= 64 &&
  typeof proof.proofValue === 'string' && proof.proofValue.trim().length > 0 && proof.proofValue.length <= 1000 &&
  (proof.customLabel === undefined || (typeof proof.customLabel === 'string' && proof.customLabel.length <= 100)) &&
  (normalizeType(proof.proofType) !== 'custom' || Boolean(proof.customLabel?.trim()))
);

const scoreProof = (stored, submitted) => {
  if (typeof stored.proofType !== 'string' || typeof stored.proofValue !== 'string') return 0;
  const type = normalizeType(stored.proofType);
  if (type !== normalizeType(submitted.proofType)) return 0;
  if (type === 'custom' && normalizeValue(stored.customLabel || '') !== normalizeValue(submitted.customLabel || '')) return 0;
  const first = normalizeValue(stored.proofValue), second = normalizeValue(submitted.proofValue);
  if (!first || !second) return 0;
  if (first === second) return 1;
  // Unknown and custom types are exact by default, so identifiers never get fuzzy matches.
  return descriptiveTypes.has(type) ? compareTwoStrings(first, second) : 0;
};
module.exports = { validateProofs, scoreProof };

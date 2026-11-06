const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProofs, scoreProof } = require('../utils/ownershipProofs');

test('serial numbers and IMEIs reject one-character changes and substrings', () => {
  for (const proofType of ['serialNumber', 'IMEI', 'receiptNumber', 'unknown']) {
    const stored = { proofType, proofValue: '123456789012345' };
    for (const proofValue of ['123456789012346', '12345678901234', 'X123456789012345']) {
      assert.equal(scoreProof(stored, { proofType, proofValue }), 0);
    }
    assert.equal(scoreProof(stored, stored), 1);
  }
});
test('identifier punctuation remains meaningful', () => {
  assert.equal(scoreProof({ proofType: 'serialNumber', proofValue: 'AB-123' }, { proofType: 'serial number', proofValue: 'AB123' }), 0);
});
test('only descriptive types support approximate matching', () => {
  const stored = { proofType: 'physicalMark', proofValue: 'small blue scratch near the handle' };
  assert.ok(scoreProof(stored, { ...stored, proofValue: 'small blue scratch near handle' }) >= 0.8);
});
test('custom fields must have the same label and exact value', () => {
  const stored = { proofType: 'custom', customLabel: 'Receipt code', proofValue: 'CODE-123' };
  assert.equal(scoreProof(stored, { ...stored, customLabel: 'Other code' }), 0);
  assert.equal(scoreProof(stored, { ...stored, proofValue: 'CODE-124' }), 0);
});
test('malformed, empty and oversized submissions are rejected', () => {
  for (const input of [null, {}, [], [null], [{ proofType: 'IMEI', proofValue: 123 }], [{ proofType: 'IMEI', proofValue: ' ' }], [{ proofType: 'custom', proofValue: 'x' }], Array(21).fill({ proofType: 'IMEI', proofValue: 'x' })]) {
    assert.equal(validateProofs(input), false);
  }
  assert.equal(validateProofs([{ proofType: 'IMEI', proofValue: '123' }]), true);
});

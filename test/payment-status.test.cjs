const test = require('node:test');
const assert = require('node:assert/strict');
const {
  deriveFeeRecordStatus,
  mapFeeRecordStatusFromInstallments,
  mapProviderPaymentStatus,
} = require('../dist/modules/payments/payment.utils.js');

test('deriveFeeRecordStatus returns PAID when all installments are settled', () => {
  const status = deriveFeeRecordStatus({
    totalAmount: 300,
    paidAmount: 300,
    installments: [],
  });

  assert.equal(status, 'PAID');
});

test('deriveFeeRecordStatus returns PARTIALLY_PAID for partial settlement', () => {
  const status = deriveFeeRecordStatus({
    totalAmount: 300,
    paidAmount: 120,
    installments: [],
  });

  assert.equal(status, 'PARTIALLY_PAID');
});

test('deriveFeeRecordStatus returns OVERDUE when outstanding balance exists after due date', () => {
  const status = deriveFeeRecordStatus({
    totalAmount: 300,
    paidAmount: 120,
    installments: [
      { id: '1', dueDate: new Date('2024-01-01'), status: 'PENDING' },
    ],
    now: new Date('2024-02-01'),
  });

  assert.equal(status, 'OVERDUE');
});

test('mapFeeRecordStatusFromInstallments returns PAID when all installments are paid', () => {
  const status = mapFeeRecordStatusFromInstallments({
    installmentStatuses: ['PAID', 'PAID'],
    hasSuccessfulPayment: true,
  });

  assert.equal(status, 'PAID');
});

test('mapFeeRecordStatusFromInstallments returns PARTIALLY_PAID when some money has been received', () => {
  const status = mapFeeRecordStatusFromInstallments({
    installmentStatuses: ['PAID', 'PENDING'],
    hasSuccessfulPayment: true,
  });

  assert.equal(status, 'PARTIALLY_PAID');
});

test('mapProviderPaymentStatus maps completed provider states to SUCCESS', () => {
  assert.equal(mapProviderPaymentStatus('completed'), 'SUCCESS');
  assert.equal(mapProviderPaymentStatus('settled'), 'SUCCESS');
});

test('mapProviderPaymentStatus keeps unknown provider states as PENDING', () => {
  assert.equal(mapProviderPaymentStatus('processing'), 'PENDING');
});
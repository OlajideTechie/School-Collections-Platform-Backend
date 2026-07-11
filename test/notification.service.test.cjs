const { after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');

const { notificationService } = require('../dist/modules/notifications/notification.service');

const originalNotificationService = { ...notificationService };

beforeEach(() => {
  Object.assign(notificationService, originalNotificationService);
});

after(() => {
  Object.assign(notificationService, originalNotificationService);
});

function captureDispatches() {
  const dispatches = [];

  notificationService.dispatchNotification = async (payload) => {
    dispatches.push(payload);
    return { success: true };
  };
  notificationService.wasInstallmentReminderSentToday = async () => false;

  return dispatches;
}

test('WhatsApp notification templates include the school name', async () => {
  const dispatches = captureDispatches();
  const baseInput = {
    paymentId: 'payment-1',
    installmentId: 'installment-1',
    recipient: '08012345678',
    parentName: 'Jane Parent',
    schoolName: 'Greenfield Academy',
    amount: 5000,
    installmentSequence: 1,
    dueDate: new Date('2026-07-20T10:00:00.000Z'),
    expiryDate: new Date('2026-07-19T10:00:00.000Z'),
    virtualAccountNumber: '1234567890',
    bankName: 'Wema Bank',
  };

  await notificationService.sendPaymentInstructions(baseInput);
  await notificationService.sendPaymentConfirmation({
    ...baseInput,
    remainingBalance: 1000,
  });
  await notificationService.sendDueSoonReminder({
    ...baseInput,
    daysUntilDue: 1,
  });
  await notificationService.sendOverdueReminder({
    ...baseInput,
    daysOverdue: 1,
  });

  assert.equal(dispatches.length, 4);
  for (const dispatch of dispatches) {
    assert.match(dispatch.message, /Greenfield Academy/);
    assert.match(dispatch.message, /Powered by ScholarPay\./);
  }
});

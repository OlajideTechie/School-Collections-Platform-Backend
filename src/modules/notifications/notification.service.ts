import prisma from '../../config/database';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { whatsappService } from '../../integrations/whatsapp/whatsapp.service';

export interface NotificationContext {
  recipient: string;
  message: string;
  paymentId?: string;
}

interface PaymentInstructionsInput {
  paymentId: string;
  recipient: string;
  parentName: string;
  amount: number;
  virtualAccountNumber: string;
  expiryDate: Date | string;
  bankName?: string;
}

interface PaymentConfirmationInput {
  paymentId: string;
  recipient: string;
  parentName: string;
  amount: number;
  installmentSequence: number;
  remainingBalance: number;
}

interface DueSoonReminderInput {
  paymentId: string;
  recipient: string;
  parentName: string;
  amount: number;
  installmentSequence: number;
  dueDate: Date | string;
  daysUntilDue: number;
}

interface OverdueReminderInput {
  paymentId: string;
  recipient: string;
  parentName: string;
  amount: number;
  installmentSequence: number;
  dueDate: Date | string;
  daysOverdue: number;
}

function formatAmount(value: number): string {
  const formattedNumber = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `₦${formattedNumber}`;
}

function formatWATDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? '').toUpperCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} (WAT)`;
}

export const notificationService = {
  async sendPaymentInstructions(input: PaymentInstructionsInput) {
    const bankName = input.bankName ?? 'Wema Bank';
    const message = [
      '🎓 ScholarPay',
      '',
      `Hello ${input.parentName},`,
      '',
      'Your payment account has been generated.',
      '',
      `Amount: ${formatAmount(input.amount)}`,
      '',
      `Bank: ${bankName}`,
      '',
      'Account Number:',
      input.virtualAccountNumber,
      '',
      'This account expires on:',
      formatWATDate(input.expiryDate),
      '',
      'Please complete your transfer before it expires.',
    ].join('\n');

    return this.dispatchNotification({
      paymentId: input.paymentId,
      recipient: input.recipient,
      message,
      channel: NotificationChannel.WHATSAPP,
    });
  },

  async sendPaymentConfirmation(input: PaymentConfirmationInput) {
    const message = [
      '🎉Payment Received',
      '',
      `Hello ${input.parentName},`,
      '',
      `We've received your payment of ${formatAmount(input.amount)}.`,
      '',
      `Installment ${input.installmentSequence} has been marked as PAID.`,
      '',
      'Remaining Balance:',
      formatAmount(input.remainingBalance),
      '',
      'Thank you for using ScholarPay.',
    ].join('\n');

    return this.dispatchNotification({
      paymentId: input.paymentId,
      recipient: input.recipient,
      message,
      channel: NotificationChannel.WHATSAPP,
    });
  },

  async sendDueSoonReminder(input: DueSoonReminderInput) {
    const reminderTitle = `⏰ Payment Reminder (Due in ${input.daysUntilDue} day${input.daysUntilDue === 1 ? '' : 's'})`;

    const alreadySent = await this.wasReminderSentToday(
      input.paymentId,
      reminderTitle
    );

    if (alreadySent) {
      return { success: true, skipped: true };
    }

    const message = [
      reminderTitle,
      '',
      `Hello ${input.parentName},`,
      '',
      `Installment ${input.installmentSequence} is due soon.`,
      `Amount: ${formatAmount(input.amount)}`,
      `Due Date: ${formatWATDate(input.dueDate)}`,
      '',
      'Please complete your transfer before the due date.',
    ].join('\n');

    return this.dispatchNotification({
      paymentId: input.paymentId,
      recipient: input.recipient,
      message,
      channel: NotificationChannel.WHATSAPP,
    });
  },

  async sendOverdueReminder(input: OverdueReminderInput) {
    const reminderTitle = `⚠️ Overdue Reminder (Day ${input.daysOverdue})`;

    const alreadySent = await this.wasReminderSentToday(
      input.paymentId,
      reminderTitle
    );

    if (alreadySent) {
      return { success: true, skipped: true };
    }

    const message = [
      reminderTitle,
      '',
      `Hello ${input.parentName},`,
      '',
      `Installment ${input.installmentSequence} is overdue.`,
      `Amount: ${formatAmount(input.amount)}`,
      `Due Date: ${formatWATDate(input.dueDate)}`,
      '',
      'Please make your payment as soon as possible.',
    ].join('\n');

    return this.dispatchNotification({
      paymentId: input.paymentId,
      recipient: input.recipient,
      message,
      channel: NotificationChannel.WHATSAPP,
    });
  },

  async sendInstallmentReminder(installment: { id: string }, context: NotificationContext) {
    return this.dispatchNotification({
      paymentId: context.paymentId,
      recipient: context.recipient,
      message: context.message,
      channel: NotificationChannel.WHATSAPP,
    });
  },

  async wasReminderSentToday(paymentId: string, reminderTitle: string): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await prisma.notification.findFirst({
      where: {
        paymentId,
        channel: NotificationChannel.WHATSAPP,
        status: NotificationStatus.SENT,
        createdAt: {
          gte: todayStart,
        },
        message: {
          startsWith: reminderTitle,
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(existing);
  },

  async dispatchNotification(payload: NotificationContext & { channel: NotificationChannel; paymentId?: string }) {
    let notificationId: string | null = null;

    if (payload.paymentId) {
      const notification = await prisma.notification.create({
        data: {
          paymentId: payload.paymentId,
          channel: payload.channel,
          recipient: payload.recipient,
          message: payload.message,
          status: NotificationStatus.PENDING,
        },
      });

      notificationId = notification.id;
    }

    try {
      if (payload.channel === NotificationChannel.WHATSAPP) {
        await whatsappService.sendMessage(payload.recipient, payload.message);
      }

      if (notificationId) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });
      }

      console.info('WhatsApp message sent successfully.');
    } catch (error) {
      if (notificationId) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.FAILED,
          },
        });
      }

      console.error('WhatsApp send failed.', error);
    }

    return { success: true };
  },
};

import prisma from '../../config/database';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { whatsappService } from '../../integrations/whatsapp/whatsapp.service';

export interface NotificationContext {
  recipient: string;
  message: string;
  paymentId?: string;
}

export const notificationService = {
  async sendVirtualAccount(paymentId: string, context: NotificationContext) {
    return this.dispatchNotification({
      paymentId,
      recipient: context.recipient,
      message: context.message,
      channel: NotificationChannel.WHATSAPP,
    });
  },

  async sendPaymentConfirmation(paymentId: string, context: NotificationContext) {
    return this.dispatchNotification({
      paymentId,
      recipient: context.recipient,
      message: context.message,
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

  async dispatchNotification(payload: NotificationContext & { channel: NotificationChannel; paymentId?: string }) {
    if (payload.paymentId) {
      await prisma.notification.create({
        data: {
          paymentId: payload.paymentId,
          channel: payload.channel,
          recipient: payload.recipient,
          message: payload.message,
          status: NotificationStatus.PENDING,
        },
      });
    }

    if (payload.channel === NotificationChannel.WHATSAPP) {
      await whatsappService.sendMessage(payload.recipient, payload.message);
    }

    return { success: true };
  },
};

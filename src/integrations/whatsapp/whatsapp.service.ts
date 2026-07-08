export interface WhatsAppSendResult {
  success: boolean;
  channel: 'WHATSAPP';
  message: string;
}

export const whatsappService = {
  async sendMessage(recipient: string, message: string): Promise<WhatsAppSendResult> {
    console.info(`[WHATSAPP] ${recipient}: ${message}`);

    return {
      success: true,
      channel: 'WHATSAPP',
      message,
    };
  },
};

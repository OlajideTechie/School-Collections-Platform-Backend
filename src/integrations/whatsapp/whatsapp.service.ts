import axios, { AxiosError } from 'axios';

interface WhatsAppCloudApiResponse {
  messaging_product: string;
  contacts?: Array<{ wa_id: string }>;
  messages?: Array<{ id: string }>;
}

export interface WhatsAppSendResult {
  success: boolean;
  channel: 'WHATSAPP';
  message: string;
  messageId?: string;
}

function normalizeRecipient(recipient: string): string {
  return recipient.replace(/[^0-9]/g, '');
}

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Missing WhatsApp Cloud API configuration.');
  }

  return { accessToken, phoneNumberId };
}

export const whatsappService = {
  async sendMessage(recipient: string, message: string): Promise<WhatsAppSendResult> {
    const { accessToken, phoneNumberId } = getWhatsAppConfig();
    const normalizedRecipient = normalizeRecipient(recipient);

    if (!normalizedRecipient) {
      throw new Error('Invalid WhatsApp recipient.');
    }

    const endpoint = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;

    try {
      const { data } = await axios.post<WhatsAppCloudApiResponse>(
        endpoint,
        {
          messaging_product: 'whatsapp',
          to: normalizedRecipient,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        channel: 'WHATSAPP',
        message,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: { message?: string } }>;
        const providerMessage =
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          'Unknown WhatsApp API error.';

        throw new Error(`WhatsApp Cloud API request failed: ${providerMessage}`);
      }

      throw error;
    }
  },
};

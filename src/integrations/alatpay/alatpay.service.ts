import crypto from "node:crypto";
import axios, { AxiosError } from "axios";

const VIRTUAL_ACCOUNT_ENDPOINT =
  "/bank-transfer/api/v1/bankTransfer/virtualAccount";
const TRANSACTION_STATUS_ENDPOINT =
  "/bank-transfer/api/v1/bankTransfer/transactions/{transactionId}";

export interface AlatpayConfig {
  baseUrl: string;
  secretKey: string;
  webhookSecret: string;
  businessId: string;
}

export interface CreateVirtualAccountCustomerInput {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  metadata?: string;
}

export interface CreateVirtualAccountInput {
  amount: number;
  orderId: string;
  description: string;
  customer: CreateVirtualAccountCustomerInput;
  currency?: "NGN" | string;
}

export interface CreateVirtualAccountResponse {
  providerPaymentId: string;
  transactionId: string;
  virtualBankAccountNumber: string;
  virtualBankCode: string;
  businessBankAccountNumber: string;
  businessBankCode: string;
  expiresAt: string;
  status: string;
}

interface AlatpayVirtualAccountResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    transactionId: string;
    virtualBankAccountNumber: string;
    virtualBankCode: string;
    businessBankAccountNumber: string;
    businessBankCode: string;
    expiredAt: string;
    status: string;
  };
}

export interface AlatpayTransactionStatusResponse {
  status: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export class AlatpayService {
  private readonly config: AlatpayConfig;

  constructor(config?: Partial<AlatpayConfig>) {
    this.config = {
      baseUrl:
        config?.baseUrl ??
        process.env.ALATPAY_BASE_URL ??
        "",

      secretKey:
        config?.secretKey ??
        process.env.ALATPAY_SECRET_KEY ??
        "",

      webhookSecret:
        config?.webhookSecret ??
        process.env.ALATPAY_WEBHOOK_SECRET ??
        "",

      businessId:
        config?.businessId ??
        process.env.ALATPAY_BUSINESS_ID ??
        "",
    };
  }

  /**
   * Create a bank transfer virtual account for an order.
   */
  async createVirtualAccount(
    input: CreateVirtualAccountInput
  ): Promise<CreateVirtualAccountResponse> {
    this.validateConfiguration();
    this.validateVirtualAccountInput(input);

    const payload = this.buildVirtualAccountPayload(input);

    try {
      console.log("========== ALATPay Request ==========");
      console.log(JSON.stringify(payload, null, 2));

      const { data } =
        await axios.post<AlatpayVirtualAccountResponse>(
          this.buildUrl(VIRTUAL_ACCOUNT_ENDPOINT),
          payload,
          {
            headers: this.buildHeaders(),
            timeout: 15000,
          }
        );

      console.log("========== ALATPay Response ==========");
      console.log(JSON.stringify(data, null, 2));

      if (!data.status) {
        throw new Error(
          data.message || "Failed to create virtual account."
        );
      }

      return this.mapVirtualAccountResponse(data);
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /**
   * Verify bank transfer transaction status.
   */
  async getPaymentStatus(
    transactionId: string
  ): Promise<AlatpayTransactionStatusResponse> {
    this.validateConfiguration();

    if (!transactionId.trim()) {
      throw new Error("Transaction ID is required.");
    }

    try {
      const { data } =
        await axios.get<AlatpayTransactionStatusResponse>(
          this.buildUrl(
            TRANSACTION_STATUS_ENDPOINT.replace(
              "{transactionId}",
              encodeURIComponent(transactionId)
            )
          ),
        {
          headers: this.buildHeaders(),
          timeout: 15000,
        }
        );

      return data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(
    rawBody: string,
    signature?: string | null
  ): boolean {
    if (!this.config.webhookSecret) {
      return true;
    }

    if (!signature) {
      return false;
    }

    const expected = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(rawBody)
      .digest("hex");

    const received = signature
      .replace(/^sha256=/i, "")
      .trim()
      .toLowerCase();

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(received)
    );
  }

  /**
   * Ensure required environment variables exist
   */
  private validateConfiguration() {
    const required = {
      ALATPAY_BASE_URL: this.config.baseUrl,
      ALATPAY_SECRET_KEY: this.config.secretKey,
      ALATPAY_BUSINESS_ID: this.config.businessId,
    };

    for (const [key, value] of Object.entries(required)) {
      if (!value) {
        throw new Error(
          `Missing environment variable: ${key}`
        );
      }
    }
  }

  private validateVirtualAccountInput(
    input: CreateVirtualAccountInput
  ): void {
    if (input.amount <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    if (!input.orderId.trim()) {
      throw new Error("Order ID is required.");
    }

    if (!input.description.trim()) {
      throw new Error("Description is required.");
    }

    const requiredCustomerFields = {
      "Customer email": input.customer.email,
      "Customer phone": input.customer.phone,
      "Customer first name": input.customer.firstName,
      "Customer last name": input.customer.lastName,
    };

    for (const [label, value] of Object.entries(
      requiredCustomerFields
    )) {
      if (!value.trim()) {
        throw new Error(`${label} is required.`);
      }
    }
  }

  private buildVirtualAccountPayload(
    input: CreateVirtualAccountInput
  ) {
    return {
      businessId: this.config.businessId,
      amount: input.amount,
      currency: input.currency ?? "NGN",
      orderId: input.orderId,
      description: input.description,
      customer: {
        email: input.customer.email,
        phone: input.customer.phone,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        metadata: input.customer.metadata ?? "",
      },
    };
  }

  private mapVirtualAccountResponse(
    response: AlatpayVirtualAccountResponse
  ): CreateVirtualAccountResponse {
    return {
      providerPaymentId: response.data.id,
      transactionId: response.data.transactionId,
      virtualBankAccountNumber:
        response.data.virtualBankAccountNumber,
      virtualBankCode: response.data.virtualBankCode,
      businessBankAccountNumber:
        response.data.businessBankAccountNumber,
      businessBankCode: response.data.businessBankCode,
      expiresAt: response.data.expiredAt,
      status: response.data.status,
    };
  }

  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": this.config.secretKey,
    };
  }

  private buildUrl(path: string): string {
    return `${this.config.baseUrl.replace(/\/+$/, "")}${path}`;
  }

  /**
   * Centralized Axios error handling
   */
  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;

      console.error("========== ALATPay Error ==========");
      console.error("Status:", axiosError.response?.status);
      console.error(
        JSON.stringify(
          axiosError.response?.data,
          null,
          2
        )
      );

      throw new Error(
        axiosError.response?.data?.message ??
          "Failed to communicate with ALATPay."
      );
    }

    console.error(error);

    throw new Error(
      "Unexpected error while communicating with ALATPay."
    );
  }
}

export const alatpayService = new AlatpayService();

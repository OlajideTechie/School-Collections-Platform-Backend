export interface DeriveFeeRecordStatusInput {
  totalAmount: number;
  paidAmount: number;
  installments: Array<{
    id?: string;
    dueDate?: Date | null;
    status?: string | null;
  }>;
  now?: Date;
}

export function deriveFeeRecordStatus({
  totalAmount,
  paidAmount,
  installments,
  now = new Date(),
}: DeriveFeeRecordStatusInput): 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' {
  if (paidAmount >= totalAmount) {
    return 'PAID';
  }

  const hasOverdueInstallment = installments.some((installment) => {
    if (!installment.dueDate) {
      return false;
    }

    return installment.dueDate < now && installment.status !== 'PAID';
  });

  if (hasOverdueInstallment) {
    return 'OVERDUE';
  }

  if (paidAmount > 0) {
    return 'PARTIALLY_PAID';
  }

  return 'PENDING';
}

export function createPaymentReference(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `alatpay_${timestamp}_${randomPart}`.toUpperCase();
}

export function getWebhookProcessingDecision(
  currentStatus: string | null | undefined,
  targetStatus: 'SUCCESS' | 'FAILED',
): 'PROCESS' | 'ALREADY_PROCESSED' {
  if (currentStatus === 'SUCCESS') {
    return 'ALREADY_PROCESSED';
  }

  if (targetStatus === 'FAILED' && currentStatus === 'FAILED') {
    return 'ALREADY_PROCESSED';
  }

  return 'PROCESS';
}

export function mapFeeRecordStatusFromInstallments(input: {
  installmentStatuses: string[];
  hasSuccessfulPayment: boolean;
}): 'PENDING' | 'PARTIALLY_PAID' | 'PAID' {
  const allInstallmentsPaid = input.installmentStatuses.every(
    (status) => status === 'PAID'
  );

  if (allInstallmentsPaid) {
    return 'PAID';
  }

  if (input.hasSuccessfulPayment) {
    return 'PARTIALLY_PAID';
  }

  return 'PENDING';
}

export function mapProviderPaymentStatus(
  providerStatus: string
): 'PENDING' | 'SUCCESS' | 'FAILED' {
  const normalizedStatus = providerStatus.trim().toUpperCase();

  if (
    [
      'SUCCESS',
      'SUCCESSFUL',
      'PAID',
      'COMPLETED',
      'COMPLETE',
      'SETTLED',
    ].includes(normalizedStatus)
  ) {
    return 'SUCCESS';
  }

  if (
    [
      'FAILED',
      'FAILURE',
      'UNSUCCESSFUL',
      'DECLINED',
      'CANCELLED',
      'CANCELED',
      'EXPIRED',
      'REVERSED',
    ].includes(normalizedStatus)
  ) {
    return 'FAILED';
  }

  return 'PENDING';
}

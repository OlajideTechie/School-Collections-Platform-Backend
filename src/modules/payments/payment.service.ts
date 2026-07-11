import { FeeRecordStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  AlatpayTransactionStatusResponse,
  alatpayService,
} from '../../integrations/alatpay/alatpay.service';
import { notificationService } from '../notifications/notification.service';
import {
  createPaymentReference,
  mapFeeRecordStatusFromInstallments,
  mapProviderPaymentStatus,
} from './payment.utils';

type InternalPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

type PaymentWithInstallment = Prisma.PaymentGetPayload<{
  include: {
    installment: {
      include: {
        feeRecord: {
          include: {
            student: {
              include: {
                school: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

interface NormalizedAlatpayStatus {
  transactionReference: string;
  providerStatus: string;
  paymentStatus: InternalPaymentStatus;
}

interface PaymentReconciliationResult {
  paymentId: string;
  status: 'PENDING' | 'SUCCESS' | 'already-processed';
  providerStatus: string;
  transactionReference: string;
  feeRecordStatus?: FeeRecordStatus;
  remainingBalance?: number;
  message?: string;
}

interface VerifyPendingPaymentsResult {
  checked: number;
  eligible: number;
  successful: number;
  pending: number;
  alreadyProcessed: number;
  failed: number;
}

const DEFAULT_PAYMENT_VERIFICATION_WINDOW_MINUTES = 180;
const DEFAULT_PAYMENT_INSTRUCTION_LEAD_DAYS = 3;
const UPCOMING_REMINDER_DAYS = new Set([3, 1]);
const OVERDUE_REMINDER_INTERVAL_DAYS = 3;

function getPaymentInstructionLeadDays(): number {
  const rawValue = process.env.PAYMENT_INSTRUCTION_LEAD_DAYS;

  if (!rawValue) {
    return DEFAULT_PAYMENT_INSTRUCTION_LEAD_DAYS;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return DEFAULT_PAYMENT_INSTRUCTION_LEAD_DAYS;
  }

  return Math.floor(parsedValue);
}

function getPaymentVerificationWindowMinutes(): number {
  const rawValue = process.env.PAYMENT_VERIFICATION_WINDOW_MINUTES;

  if (!rawValue) {
    return DEFAULT_PAYMENT_VERIFICATION_WINDOW_MINUTES;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_PAYMENT_VERIFICATION_WINDOW_MINUTES;
  }

  return Math.floor(parsedValue);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(
  source: Record<string, unknown>,
  paths: string[][]
): string | null {
  for (const path of paths) {
    let current: unknown = source;

    for (const segment of path) {
      const record = asRecord(current);
      if (!record) {
        current = undefined;
        break;
      }

      current = record[segment];
    }

    if (typeof current === 'string' && current.trim()) {
      return current.trim();
    }

    if (typeof current === 'number') {
      return String(current);
    }
  }

  return null;
}

function mapProviderStatus(providerStatus: string): InternalPaymentStatus {
  return mapProviderPaymentStatus(providerStatus);
}

function normalizeAlatpayStatusPayload(
  payload: unknown,
  fallbackTransactionReference?: string
): NormalizedAlatpayStatus {
  const body = asRecord(payload) ?? {};
  const transactionReference =
    readString(body, [
      ['data', 'transactionId'],
      ['data', 'transactionReference'],
      ['data', 'reference'],
      ['data', 'orderId'],
      ['transactionId'],
      ['transactionReference'],
      ['reference'],
      ['orderId'],
      ['paymentReference'],
    ]) ?? fallbackTransactionReference;

  if (!transactionReference) {
    throw new Error('Missing transaction reference.');
  }

  const providerStatus =
    readString(body, [
      ['data', 'status'],
      ['data', 'transactionStatus'],
      ['data', 'paymentStatus'],
      ['transactionStatus'],
      ['paymentStatus'],
      ['status'],
    ]) ?? 'PENDING';

  return {
    transactionReference,
    providerStatus,
    paymentStatus: mapProviderStatus(providerStatus),
  };
}

function isNormalizedAlatpayStatus(
  value: unknown
): value is NormalizedAlatpayStatus {
  const record = asRecord(value);

  return Boolean(
    record &&
      typeof record.transactionReference === 'string' &&
      typeof record.providerStatus === 'string' &&
      typeof record.paymentStatus === 'string'
  );
}

async function findPaymentByTransactionReference(transactionReference: string) {
  return prisma.payment.findFirst({
    where: {
      OR: [
        { transactionReference },
        { reference: transactionReference },
      ],
    },
    include: {
      installment: {
        include: {
          feeRecord: {
            include: {
              student: {
                include: {
                  school: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export const paymentService = {
  async generateVirtualAccountsForDueInstallments() {
    const now = new Date();
    const leadDays = getPaymentInstructionLeadDays();
    const dueThreshold = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

    const installments = await prisma.installment.findMany({
      where: {
        status: {
          not: 'PAID',
        },
        dueDate: {
          lte: dueThreshold,
        },
      },
      include: {
        feeRecord: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const installment of installments) {
      try {
        await this.generateInstallmentVirtualAccount(
          installment.id,
          installment.feeRecord.student.schoolId
        );
        generated += 1;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Pending payment already exists for this installment.'
        ) {
          skipped += 1;
          continue;
        }

        failed += 1;
        console.error(
          `[PaymentInstructionJob] Failed to generate virtual account for installment ${installment.id}:`,
          error
        );
      }
    }

    return {
      checked: installments.length,
      generated,
      skipped,
      failed,
    };
  },

  async generateInstallmentVirtualAccount(
    installmentId: string,
    schoolId: string,
    options?: { regenerateIfPending?: boolean }
  ) {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        feeRecord: {
          include: {
            student: {
              include: {
                school: true,
              },
            },
          },
        },
      },
    });

    if (!installment) {
      throw new Error('Installment not found.');
    }

    if (installment.feeRecord.student.schoolId !== schoolId) {
      throw new Error('Installment does not belong to the authenticated school.');
    }

    if (installment.status === 'PAID') {
      throw new Error('Installment already paid.');
    }

    const existingPendingPayment = await prisma.payment.findFirst({
      where: {
        installmentId: installment.id,
        status: PaymentStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingPendingPayment) {
      if (options?.regenerateIfPending) {
        await prisma.payment.update({
          where: { id: existingPendingPayment.id },
          data: { status: PaymentStatus.FAILED },
        });
      } else {
        throw new Error('Pending payment already exists for this installment.');
      }
    }

    const reference = createPaymentReference();
    const student = installment.feeRecord.student;
    const customerEmail = student.parentEmail?.trim();
    const customerPhone = student.parentPhone?.trim();

    if (!customerEmail) {
      throw new Error('Customer email is required.');
    }

    if (!customerPhone) {
      throw new Error('Customer phone is required.');
    }

    const payment = await prisma.payment.create({
      data: {
        installmentId: installment.id,
        reference,
        amount: installment.amount.toString(),
        status: 'PENDING',
      },
    });

    const virtualAccount = await alatpayService.createVirtualAccount({
      amount: Number(installment.amount.toString()),
      orderId: reference,
      description: `Installment ${installment.sequence} payment for ${student.firstName} ${student.lastName}`,
      customer: {
        email: customerEmail,
        phone: customerPhone,
        firstName: student.firstName,
        lastName: student.lastName,
        metadata: JSON.stringify({
          paymentId: payment.id,
          installmentId: installment.id,
          feeRecordId: installment.feeRecordId,
          schoolId,
          reference,
        }),
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionReference: virtualAccount.transactionId,
      },
    });

    await notificationService.sendPaymentInstructions({
      paymentId: payment.id,
      recipient: customerPhone || customerEmail,
      parentName: student.parentName,
      schoolName: student.school.name,
      amount: Number(installment.amount.toString()),
      virtualAccountNumber: virtualAccount.virtualBankAccountNumber,
      expiryDate: virtualAccount.expiresAt,
      bankName: 'Wema Bank',
    });

    return {
      paymentId: payment.id,
      reference,
      providerPaymentId: virtualAccount.providerPaymentId,
      transactionId: virtualAccount.transactionId,
      virtualBankAccountNumber: virtualAccount.virtualBankAccountNumber,
      virtualBankCode: virtualAccount.virtualBankCode,
      businessBankAccountNumber: virtualAccount.businessBankAccountNumber,
      businessBankCode: virtualAccount.businessBankCode,
      expiresAt: virtualAccount.expiresAt,
      amount: Number(installment.amount.toString()),
      installmentId: installment.id,
      status: 'PENDING',
    };
  },

  async verifyPendingPayments(): Promise<VerifyPendingPaymentsResult> {
    const verificationWindowMinutes = getPaymentVerificationWindowMinutes();
    const recentThreshold = new Date(
      Date.now() - verificationWindowMinutes * 60 * 1000
    );

    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        transactionReference: {
          not: null,
        },
        createdAt: {
          gte: recentThreshold,
        },
      },
      include: {
        installment: {
          include: {
            feeRecord: {
              include: {
                student: {
                  include: {
                    school: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const summary: VerifyPendingPaymentsResult = {
      checked: pendingPayments.length,
      eligible: pendingPayments.length,
      successful: 0,
      pending: 0,
      alreadyProcessed: 0,
      failed: 0,
    };

    for (const payment of pendingPayments) {
      try {
        const result = await this.reconcilePayment(payment);

        if (result.status === 'SUCCESS') {
          summary.successful += 1;
          continue;
        }

        if (result.status === 'already-processed') {
          summary.alreadyProcessed += 1;
          continue;
        }

        summary.pending += 1;
      } catch (error) {
        summary.failed += 1;
        console.error(
          `[PaymentVerification] Failed to reconcile payment ${payment.id}:`,
          error
        );
      }
    }

    return summary;
  },

  // Retrieve payment history for a specific installment   
  async getInstallmentPaymentHistory(
    installmentId: string,
    schoolId: string,
    options?: { skip?: number; limit?: number }
  ) {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        feeRecord: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!installment) {
      throw new Error('Installment not found.');
    }

    if (installment.feeRecord.student.schoolId !== schoolId) {
      throw new Error('Installment does not belong to the authenticated school.');
    }

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where: { installmentId },
        orderBy: { createdAt: 'asc' },
        skip: options?.skip,
        take: options?.limit,
      }),
      prisma.payment.count({ where: { installmentId } }),
    ]);

    return {
      data: payments.map((payment) => ({
        message: `Payment for installment ${installment.sequence} has been processed.`,
        id: payment.id,
        reference: payment.reference,
        transactionReference: payment.transactionReference,
        amount: Number(payment.amount.toString()),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      })),
      total,
    };
  },

  async verifyAlatpayTransaction(transactionReference: string, schoolId: string) {
    if (!transactionReference.trim()) {
      throw new Error('Transaction reference is required.');
    }

    const payment = await findPaymentByTransactionReference(transactionReference);

    if (!payment) {
      throw new Error('Payment not found.');
    }

    if (payment.installment.feeRecord.student.schoolId !== schoolId) {
      throw new Error('Payment does not belong to the authenticated school.');
    }

    const providerTransactionReference = payment.transactionReference ?? transactionReference;
    const providerResponse = await alatpayService.getPaymentStatus(providerTransactionReference);
    const updateResult = await this.reconcilePayment(payment, providerResponse);

    return {
      ...updateResult,
      providerResponse,
    };
  },

  async getPaymentsPaginated(
    schoolId: string,
    options: {
      skip: number;
      limit: number;
      status?: PaymentStatus;
    }
  ) {
    const where = {
      installment: {
        feeRecord: {
          student: {
            schoolId,
          },
        },
      },
      ...(options.status ? { status: options.status } : {}),
    };

    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          installment: {
            include: {
              feeRecord: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: options.skip,
        take: options.limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((payment) => ({
        id: payment.id,
        installmentId: payment.installmentId,
        installmentSequence: payment.installment.sequence,
        reference: payment.reference,
        transactionReference: payment.transactionReference,
        amount: Number(payment.amount.toString()),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        student: {
          id: payment.installment.feeRecord.student.id,
          firstName: payment.installment.feeRecord.student.firstName,
          lastName: payment.installment.feeRecord.student.lastName,
          parentName: payment.installment.feeRecord.student.parentName,
        },
      })),
      total,
    };
  },

  async reconcilePayment(
    payment: PaymentWithInstallment,
    verificationResponse?: AlatpayTransactionStatusResponse | NormalizedAlatpayStatus
  ): Promise<PaymentReconciliationResult> {
    const providerTransactionReference = payment.transactionReference ?? payment.reference;
    const normalizedStatus = isNormalizedAlatpayStatus(verificationResponse)
      ? verificationResponse
      : normalizeAlatpayStatusPayload(
          verificationResponse ?? await alatpayService.getPaymentStatus(providerTransactionReference),
          providerTransactionReference
        );

    if (normalizedStatus.paymentStatus !== 'SUCCESS') {
      return {
        paymentId: payment.id,
        status: 'PENDING',
        providerStatus: normalizedStatus.providerStatus,
        transactionReference: normalizedStatus.transactionReference,
        message: 'Payment is still pending with ALATPay.',
      };
    }

    return this.handleSuccessfulPayment(payment, normalizedStatus);
  },

  async handleSuccessfulPayment(
    payment: PaymentWithInstallment,
    verificationResponse: NormalizedAlatpayStatus
  ): Promise<PaymentReconciliationResult> {
    const result = await prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            not: PaymentStatus.SUCCESS,
          },
        },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          transactionReference: verificationResponse.transactionReference,
        },
      });

      if (paymentUpdate.count === 0) {
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });

        return {
          paymentId: payment.id,
          status: 'already-processed' as const,
          providerStatus: verificationResponse.providerStatus,
          transactionReference: verificationResponse.transactionReference,
          feeRecordStatus: currentPayment?.status === PaymentStatus.SUCCESS
            ? await this.updateFeeRecordStatus(payment.installment.feeRecordId, tx)
            : undefined,
          message: 'Payment has already been processed.',
        };
      }

      await tx.installment.update({
        where: {
          id: payment.installmentId,
        },
        data: {
          status: 'PAID',
        },
      });

      const feeRecordStatus = await this.updateFeeRecordStatus(
        payment.installment.feeRecordId,
        tx
      );

      const feeRecord = await tx.feeRecord.findUnique({
        where: { id: payment.installment.feeRecordId },
        include: {
          installments: {
            include: {
              payments: true,
            },
          },
        },
      });

      if (!feeRecord) {
        throw new Error('Fee record not found.');
      }

      const paidAmount = feeRecord.installments.reduce((sum, installment) => {
        const installmentPaid = installment.payments
          .filter((paymentEntry) => paymentEntry.status === PaymentStatus.SUCCESS)
          .reduce((subtotal, paymentEntry) => subtotal + Number(paymentEntry.amount.toString()), 0);

        return sum + installmentPaid;
      }, 0);

      const remainingBalance = Math.max(
        Number(feeRecord.totalAmount.toString()) - paidAmount,
        0
      );

      return {
        paymentId: payment.id,
        status: 'SUCCESS' as const,
        providerStatus: verificationResponse.providerStatus,
        transactionReference: verificationResponse.transactionReference,
        feeRecordStatus,
        remainingBalance,
      };
    });

    if (result.status === 'SUCCESS') {
      await notificationService.sendPaymentConfirmation({
        paymentId: payment.id,
        recipient:
          payment.installment.feeRecord.student.parentPhone ||
          payment.installment.feeRecord.student.parentEmail ||
          '',
        parentName: payment.installment.feeRecord.student.parentName,
        schoolName: payment.installment.feeRecord.student.school.name,
        amount: Number(payment.amount.toString()),
        installmentSequence: payment.installment.sequence,
        remainingBalance: result.remainingBalance ?? 0,
      });
    }

    return result;
  },

  async updateFeeRecordStatus(
    feeRecordId: string,
    tx: PrismaExecutor = prisma
  ): Promise<FeeRecordStatus> {
    const feeRecord = await tx.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        installments: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!feeRecord) {
      throw new Error('Fee record not found.');
    }

    const hasSuccessfulPayment = feeRecord.installments.some((installment) =>
      installment.payments.some(
        (paymentEntry) => paymentEntry.status === PaymentStatus.SUCCESS
      )
    );

    const nextStatus = mapFeeRecordStatusFromInstallments({
      installmentStatuses: feeRecord.installments.map(
        (installment) => installment.status
      ),
      hasSuccessfulPayment,
    }) as FeeRecordStatus;

    await tx.feeRecord.update({
      where: { id: feeRecordId },
      data: {
        status: nextStatus,
      },
    });

    return nextStatus;
  },

  async handleAlatpayWebhook(payload: unknown) {
    const normalizedStatus = normalizeAlatpayStatusPayload(payload);
    const payment = await findPaymentByTransactionReference(normalizedStatus.transactionReference);

    if (!payment) {
      throw new Error('Payment not found.');
    }

    return this.reconcilePayment(payment, normalizedStatus);
  },

  async sendInstallmentReminders(daysBefore = 3) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);

    const installments = await prisma.installment.findMany({
      where: {
        status: { not: 'PAID' },
        dueDate: { lte: cutoff },
      },
      include: {
        feeRecord: {
          include: {
            student: {
              include: {
                school: true,
              },
            },
          },
        },
      },
    });

    let remindersSent = 0;

    for (const installment of installments) {
      const recipient =
        installment.feeRecord.student.parentPhone ||
        installment.feeRecord.student.parentEmail ||
        '';

      if (!recipient) {
        continue;
      }

      const dueDate = installment.dueDate;
      const dayInMs = 24 * 60 * 60 * 1000;
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / dayInMs);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / dayInMs);

      const dueSoonTitle = `⏰ Payment Reminder (Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'})`;
      const overdueTitle = `⚠️ Overdue Reminder (Day ${daysOverdue})`;

      try {
        if (daysUntilDue >= 0 && UPCOMING_REMINDER_DAYS.has(daysUntilDue)) {
          const alreadySent = await notificationService.wasInstallmentReminderSentToday(
            installment.id,
            dueSoonTitle
          );

          if (alreadySent) {
            continue;
          }

          const refreshedPayment = await this.generateInstallmentVirtualAccount(
            installment.id,
            installment.feeRecord.student.schoolId,
            { regenerateIfPending: true }
          );

          await notificationService.sendDueSoonReminder({
            paymentId: refreshedPayment.paymentId,
            installmentId: installment.id,
            recipient,
            parentName: installment.feeRecord.student.parentName,
            schoolName: installment.feeRecord.student.school.name,
            amount: Number(installment.amount.toString()),
            installmentSequence: installment.sequence,
            dueDate,
            daysUntilDue,
            virtualAccountNumber: refreshedPayment.virtualBankAccountNumber,
            expiryDate: refreshedPayment.expiresAt,
            bankName: 'Wema Bank',
          });
          remindersSent += 1;
          continue;
        }

        if (daysOverdue >= 1 && daysOverdue % OVERDUE_REMINDER_INTERVAL_DAYS === 1) {
          const alreadySent = await notificationService.wasInstallmentReminderSentToday(
            installment.id,
            overdueTitle
          );

          if (alreadySent) {
            continue;
          }

          const refreshedPayment = await this.generateInstallmentVirtualAccount(
            installment.id,
            installment.feeRecord.student.schoolId,
            { regenerateIfPending: true }
          );

          await notificationService.sendOverdueReminder({
            paymentId: refreshedPayment.paymentId,
            installmentId: installment.id,
            recipient,
            parentName: installment.feeRecord.student.parentName,
            schoolName: installment.feeRecord.student.school.name,
            amount: Number(installment.amount.toString()),
            installmentSequence: installment.sequence,
            dueDate,
            daysOverdue,
            virtualAccountNumber: refreshedPayment.virtualBankAccountNumber,
            expiryDate: refreshedPayment.expiresAt,
            bankName: 'Wema Bank',
          });
          remindersSent += 1;
        }
      } catch (error) {
        console.error(
          `[PaymentReminder] Failed to send reminder for installment ${installment.id}:`,
          error
        );
      }
    }

    return remindersSent;
  },
};

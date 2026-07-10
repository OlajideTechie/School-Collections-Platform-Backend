import { FeeRecordStatus, PaymentStatus } from '@prisma/client';
import prisma from '../../config/database';

const DEFAULT_RECENT_PAYMENTS_LIMIT = 5;
const MAX_RECENT_PAYMENTS_LIMIT = 20;
const DUE_SOON_WINDOW_DAYS = 7;

function normalizeRecentPaymentsLimit(limit?: number): number {
  if (!Number.isFinite(limit) || !limit || limit <= 0) {
    return DEFAULT_RECENT_PAYMENTS_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_RECENT_PAYMENTS_LIMIT);
}

function toPercentage(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

export const dashboardService = {
  async getOverview(schoolId: string, options?: { recentPaymentsLimit?: number }) {
    const recentPaymentsLimit = normalizeRecentPaymentsLimit(
      options?.recentPaymentsLimit
    );
    const now = new Date();
    const dueSoonThreshold = new Date(
      now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const schoolScopedPaymentWhere = {
      installment: {
        feeRecord: {
          student: {
            schoolId,
          },
        },
      },
    };

    const [
      paymentSummary,
      feeRecordSummary,
      feeRecordStatusCounts,
      overdueInstallmentSummary,
      dueSoonInstallmentsCount,
      unpaidInstallmentsCount,
      pendingPaymentsCount,
      paymentsCount,
      recentPayments,
    ] =
      await prisma.$transaction([
        prisma.payment.aggregate({
          where: {
            ...schoolScopedPaymentWhere,
            status: PaymentStatus.SUCCESS,
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.feeRecord.aggregate({
          where: {
            student: {
              schoolId,
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),
        prisma.feeRecord.groupBy({
          by: ['status'],
          where: {
            student: {
              schoolId,
            },
          },
          _count: {
            _all: true,
          },
        }),
        prisma.installment.aggregate({
          where: {
            status: {
              not: 'PAID',
            },
            dueDate: {
              lt: now,
            },
            feeRecord: {
              student: {
                schoolId,
              },
            },
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.installment.count({
          where: {
            status: {
              not: 'PAID',
            },
            dueDate: {
              gte: now,
              lte: dueSoonThreshold,
            },
            feeRecord: {
              student: {
                schoolId,
              },
            },
          },
        }),
        prisma.installment.count({
          where: {
            status: {
              not: 'PAID',
            },
            feeRecord: {
              student: {
                schoolId,
              },
            },
          },
        }),
        prisma.payment.count({
          where: {
            ...schoolScopedPaymentWhere,
            status: PaymentStatus.PENDING,
          },
        }),
        prisma.payment.count({
          where: schoolScopedPaymentWhere,
        }),
        prisma.payment.findMany({
          where: schoolScopedPaymentWhere,
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
          orderBy: [
            {
              paidAt: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
          take: recentPaymentsLimit,
        }),
      ]);

    const totalCollected = Number(paymentSummary._sum.amount?.toString() ?? 0);
    const totalBilled = Number(feeRecordSummary._sum.totalAmount?.toString() ?? 0);
    const totalOutstandingBalance = Math.max(totalBilled - totalCollected, 0);
    const collectionRate = totalBilled > 0
      ? Number(((totalCollected / totalBilled) * 100).toFixed(2))
      : 0;
    const overdueAmount = Number(
      overdueInstallmentSummary._sum.amount?.toString() ?? 0
    );

    const feeRecordStatusCountsByStatus = {
      pending:
        feeRecordStatusCounts.find((item) => item.status === FeeRecordStatus.PENDING)
          ?._count._all ?? 0,
      partiallyPaid:
        feeRecordStatusCounts.find(
          (item) => item.status === FeeRecordStatus.PARTIALLY_PAID
        )?._count._all ?? 0,
      paid:
        feeRecordStatusCounts.find((item) => item.status === FeeRecordStatus.PAID)
          ?._count._all ?? 0,
      overdue:
        feeRecordStatusCounts.find((item) => item.status === FeeRecordStatus.OVERDUE)
          ?._count._all ?? 0,
    };
    const totalFeeRecords = Object.values(feeRecordStatusCountsByStatus).reduce(
      (total, count) => total + count,
      0
    );

    const feeRecordStatusBreakdown = {
      pending: toPercentage(feeRecordStatusCountsByStatus.pending, totalFeeRecords),
      partiallyPaid: toPercentage(
        feeRecordStatusCountsByStatus.partiallyPaid,
        totalFeeRecords
      ),
      paid: toPercentage(feeRecordStatusCountsByStatus.paid, totalFeeRecords),
      overdue: toPercentage(feeRecordStatusCountsByStatus.overdue, totalFeeRecords),
    };

    return {
      totals: {
        totalCollected,
        totalOutstandingBalance,
        totalPartialPayments: feeRecordStatusBreakdown.partiallyPaid,
        collectionRate,
        overdueAmount,
        dueSoonInstallmentsCount: toPercentage(
          dueSoonInstallmentsCount,
          unpaidInstallmentsCount
        ),
        pendingPaymentsCount: toPercentage(pendingPaymentsCount, paymentsCount),
      },
      feeRecordStatusBreakdown,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        reference: payment.reference,
        transactionReference: payment.transactionReference,
        amount: Number(payment.amount.toString()),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        installment: {
          id: payment.installment.id,
          sequence: payment.installment.sequence,
          dueDate: payment.installment.dueDate,
        },
        feeRecord: {
          id: payment.installment.feeRecord.id,
          title: payment.installment.feeRecord.title,
          status: payment.installment.feeRecord.status,
        },
        student: {
          id: payment.installment.feeRecord.student.id,
          firstName: payment.installment.feeRecord.student.firstName,
          lastName: payment.installment.feeRecord.student.lastName,
          parentName: payment.installment.feeRecord.student.parentName,
        },
      })),
    };
  },
};

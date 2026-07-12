import prisma from '../../config/database';
import { CreateFeeRecordInput } from '../../validation/feeRecord.validation';
import { InstallmentGeneratorService } from './installmentGenerator.service';
import { FeeRecordStatus } from '@prisma/client';

// Helper functions to calculate paid amounts and map fee records
function getInstallmentPaidAmount(installment: any): number {
  return (
    installment.payments?.reduce((paid: number, payment: any) => {
      if (payment.status !== 'SUCCESS') {
        return paid;
      }

      return paid + Number(payment.amount.toString());
    }, 0) ?? 0
  );
}

function hasSuccessfulPayment(installment: any): boolean {
  return (
    installment.payments?.some(
      (payment: any) => payment.status === 'SUCCESS'
    ) ?? false
  );
}

function mapFeeRecord(record: any) {
  const installments = record.installments.map((ins: any) => ({
    id: ins.id,
    installmentNumber: ins.sequence,
    amount: Number(ins.amount.toString()),
    dueDate: ins.dueDate,
    status: ins.status,
    virtualAccount: null,
  }));

  const amountPaid = record.installments.reduce(
    (sum: number, installment: any) => sum + getInstallmentPaidAmount(installment),
    0
  );

  const installmentsPaid = record.installments.filter((installment: any) =>
    hasSuccessfulPayment(installment)
  ).length;

  const paymentSummary = {
    totalAmount: Number(record.totalAmount.toString()),
    amountPaid,
    outstandingBalance: Number(record.totalAmount.toString()) - amountPaid,
    installmentsPaid,
    installmentsPending: record.installments.length - installmentsPaid,
  };

  return {
    id: record.id,
    student: {
      id: record.student.id,
      firstName: record.student.firstName,
      lastName: record.student.lastName,
      parentName: record.student.parentName,
      parentPhone: record.student.parentPhone,
      parentEmail: record.student.parentEmail,
      schoolId: record.student.schoolId,
    },
    title: record.title,
    totalAmount: Number(record.totalAmount.toString()),
    installmentCount: record.installmentCount,
    startDate: record.startDate,
    dueDate: record.dueDate,
    status: record.status,
    paymentSummary,
    virtualAccounts: null,
    installments,
  };
}

export const feeRecordService = {
  async createFeeRecord(payload: CreateFeeRecordInput, schoolId: string) {
    // Transactional: create fee record and installments
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: payload.studentId } });

      if (!student) {
        throw new Error('Student not found.');
      }

      if (student.schoolId !== schoolId) {
        throw new Error('Student does not belong to the authenticated school.');
      }

      const feeRecord = await tx.feeRecord.create({
        data: {
          studentId: payload.studentId,
          title: payload.title,
          totalAmount: payload.totalAmount.toString(),
          installmentCount: payload.installmentCount,
          startDate: payload.collectionStartDate ? new Date(payload.collectionStartDate) : undefined,
          dueDate: payload.collectionDueDate ? new Date(payload.collectionDueDate) : undefined,
        },
      });

      const collectionStartDate = payload.collectionStartDate ? new Date(payload.collectionStartDate) : undefined;
      const collectionDueDate = payload.collectionDueDate ? new Date(payload.collectionDueDate) : undefined;
      
      // Generate installments based on the total amount, installment count, and collection dates
      const installmentsToCreate = InstallmentGeneratorService.generate(
        payload.totalAmount,
        payload.installmentCount,
        collectionStartDate,
        collectionDueDate,
      ).map((it) => ({
        feeRecordId: feeRecord.id,
        sequence: it.installmentNumber,
        amount: it.amount.toFixed(2),
        dueDate: it.dueDate,
      }));

      // create installments
      await tx.installment.createMany({ data: installmentsToCreate });

      // reload fee record with installments and student details
      const full = await tx.feeRecord.findUnique({
        where: { id: feeRecord.id },
        include: {
          installments: { include: { payments: true } },
          student: true,
        },
      });

      return full;
    });

    // Convert Decimal strings to numbers for response
    if (!result) return null;

    const installments = result.installments.map((ins: any) => ({
      id: ins.id,
      installmentNumber: ins.sequence,
      amount: Number(ins.amount.toString()),
      dueDate: ins.dueDate,
      status: ins.status,
      virtualAccount: null,
    }));

    const amountPaid = result.installments.reduce(
      (sum: number, installment: any) => sum + getInstallmentPaidAmount(installment),
      0
    );

    const installmentsPaid = result.installments.filter((installment: any) =>
      hasSuccessfulPayment(installment)
    ).length;

    const paymentSummary = {
      totalAmount: Number(result.totalAmount.toString()),
      amountPaid,
      outstandingBalance: Number(result.totalAmount.toString()) - amountPaid,
      installmentsPaid,
      installmentsPending: result.installments.length - installmentsPaid,
    };

    const feeRecord = {
      id: result.id,
      student: {
        id: result.student.id,
        firstName: result.student.firstName,
        lastName: result.student.lastName,
        parentName: result.student.parentName,
        parentPhone: result.student.parentPhone,
        parentEmail: result.student.parentEmail,
        schoolId: result.student.schoolId,
      },
      title: result.title,
      totalAmount: Number(result.totalAmount.toString()),
      installmentCount: result.installmentCount,
      startDate: result.startDate,
      dueDate: result.dueDate,
      status: result.status,
      paymentSummary,
      virtualAccounts: null,
      installments,
    };

    return feeRecord;
  },

  async getFeeRecords(
    schoolId: string,
    options?: {
      status?: FeeRecordStatus;
      skip?: number;
      limit?: number;
    }
  ) {
    const where = {
      student: {
        schoolId,
      },
      ...(options?.status ? { status: options.status } : {}),
    };

    const [records, total, statusCounts] = await prisma.$transaction([
      prisma.feeRecord.findMany({
        where,
        include: {
          student: true,
          installments: {
            include: {
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: options?.skip,
        take: options?.limit,
      }),
      prisma.feeRecord.count({ where }),
      prisma.feeRecord.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: {
          student: {
            schoolId,
          },
        },
      }),
    ]);

    const summary = {
      total: statusCounts.reduce((sum, item) => sum + item._count._all, 0),
      pending: statusCounts.find((item) => item.status === 'PENDING')?._count._all ?? 0,
      partiallyPaid: statusCounts.find((item) => item.status === 'PARTIALLY_PAID')?._count._all ?? 0,
      paid: statusCounts.find((item) => item.status === 'PAID')?._count._all ?? 0,
      overdue: statusCounts.find((item) => item.status === 'OVERDUE')?._count._all ?? 0,
    };

    return {
      data: records.map(mapFeeRecord),
      total,
      summary,
    };
  },

  async getFeeRecordById(feeRecordId: string, schoolId: string) {
    const record = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        student: true,
        installments: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    // Verify the fee record belongs to the school
    if (record.student.schoolId !== schoolId) {
      return null;
    }

    const installments = record.installments.map((ins: any) => ({
      id: ins.id,
      installmentNumber: ins.sequence,
      amount: Number(ins.amount.toString()),
      dueDate: ins.dueDate,
      status: ins.status,
      virtualAccount: null,
    }));

    const amountPaid = record.installments.reduce(
      (sum: number, installment: any) => sum + getInstallmentPaidAmount(installment),
      0
    );

    const installmentsPaid = record.installments.filter((installment: any) =>
      hasSuccessfulPayment(installment)
    ).length;

    const paymentSummary = {
      totalAmount: Number(record.totalAmount.toString()),
      amountPaid,
      outstandingBalance: Number(record.totalAmount.toString()) - amountPaid,
      installmentsPaid,
      installmentsPending: record.installments.length - installmentsPaid,
    };

    return {
      id: record.id,
      student: {
        id: record.student.id,
        firstName: record.student.firstName,
        lastName: record.student.lastName,
        parentName: record.student.parentName,
        parentPhone: record.student.parentPhone,
        parentEmail: record.student.parentEmail,
        schoolId: record.student.schoolId,
      },
      title: record.title,
      totalAmount: Number(record.totalAmount.toString()),
      installmentCount: record.installmentCount,
      startDate: record.startDate,
      dueDate: record.dueDate,
      status: record.status,
      paymentSummary,
      virtualAccounts: null,
      installments,
    };
  },

  async getInstallments(
    feeRecordId: string,
    schoolId: string,
    options?: { skip?: number; limit?: number }
  ) {
    const record = await prisma.feeRecord.findUnique({
      where: { id: feeRecordId },
      include: {
        student: true,
        installments: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    // Verify the fee record belongs to the school
    if (record.student.schoolId !== schoolId) {
      return null;
    }

    const total = record.installments.length;
    const installments = record.installments
      .sort((a: any, b: any) => a.sequence - b.sequence)
      .slice(options?.skip ?? 0, (options?.skip ?? 0) + (options?.limit ?? total))
      .map((ins: any) => ({
      id: ins.id,
      installmentNumber: ins.sequence,
      amount: Number(ins.amount.toString()),
      dueDate: ins.dueDate,
      status: ins.status,
      payments: ins.payments.map((p: any) => ({
        id: p.id,
        reference: p.reference,
        transactionReference: p.transactionReference,
        amount: Number(p.amount.toString()),
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    }));

    return {
      data: installments,
      total,
    };
  },
};

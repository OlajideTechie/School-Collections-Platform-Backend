import prisma from '../../config/database';
import { CreateFeeRecordInput } from '../../validation/feeRecord.validation';
import { InstallmentGeneratorService } from './installmentGenerator.service';

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

    const amountPaid = result.installments.reduce((sum: number, ins: any) => {
      const installmentPaid = ins.payments?.reduce((paid: number, p: any) => paid + Number(p.amount.toString()), 0) ?? 0;
      return sum + installmentPaid;
    }, 0);

    const paymentSummary = {
      totalAmount: Number(result.totalAmount.toString()),
      amountPaid,
      outstandingBalance: Number(result.totalAmount.toString()) - amountPaid,
      installmentsPaid: result.installments.filter((ins: any) => ins.payments?.length > 0).length,
      installmentsPending: result.installments.filter((ins: any) => ins.payments?.length === 0).length,
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

  async getFeeRecords(schoolId: string) {
    const records = await prisma.feeRecord.findMany({
      where: {
        student: {
          schoolId,
        },
      },
      include: {
        student: true,
        installments: {
          include: {
            payments: true,
          },
        },
      },
    });

    return records.map((record) => {
      const installments = record.installments.map((ins: any) => ({
        id: ins.id,
        installmentNumber: ins.sequence,
        amount: Number(ins.amount.toString()),
        dueDate: ins.dueDate,
        status: ins.status,
        virtualAccount: null,
      }));

      const amountPaid = record.installments.reduce((sum: number, ins: any) => {
        const installmentPaid = ins.payments?.reduce((paid: number, p: any) => paid + Number(p.amount.toString()), 0) ?? 0;
        return sum + installmentPaid;
      }, 0);

      const paymentSummary = {
        totalAmount: Number(record.totalAmount.toString()),
        amountPaid,
        outstandingBalance: Number(record.totalAmount.toString()) - amountPaid,
        installmentsPaid: record.installments.filter((ins: any) => ins.payments?.length > 0).length,
        installmentsPending: record.installments.filter((ins: any) => ins.payments?.length === 0).length,
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
    });
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

    const amountPaid = record.installments.reduce((sum: number, ins: any) => {
      const installmentPaid = ins.payments?.reduce((paid: number, p: any) => paid + Number(p.amount.toString()), 0) ?? 0;
      return sum + installmentPaid;
    }, 0);

    const paymentSummary = {
      totalAmount: Number(record.totalAmount.toString()),
      amountPaid,
      outstandingBalance: Number(record.totalAmount.toString()) - amountPaid,
      installmentsPaid: record.installments.filter((ins: any) => ins.payments?.length > 0).length,
      installmentsPending: record.installments.filter((ins: any) => ins.payments?.length === 0).length,
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

  async getInstallments(feeRecordId: string, schoolId: string) {
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

    return record.installments.map((ins: any) => ({
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
  },
};

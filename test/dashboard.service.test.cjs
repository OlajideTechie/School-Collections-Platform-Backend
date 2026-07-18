const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../dist/config/database').default;
const { dashboardService } = require('../dist/modules/dashboard/dashboard.service');

function decimal(value) {
  return {
    toString() {
      return String(value);
    },
  };
}

function mockDashboardPrisma(transactionResults) {
  const originals = {
    transaction: prisma.$transaction,
    paymentAggregate: prisma.payment.aggregate,
    paymentCount: prisma.payment.count,
    paymentFindMany: prisma.payment.findMany,
    feeRecordAggregate: prisma.feeRecord.aggregate,
    feeRecordFindMany: prisma.feeRecord.findMany,
    feeRecordGroupBy: prisma.feeRecord.groupBy,
    installmentAggregate: prisma.installment.aggregate,
    installmentCount: prisma.installment.count,
  };
  const calls = [];
  const operation = (method) => (args) => {
    calls.push({ method, args });
    return { method, args };
  };

  prisma.payment.aggregate = operation('payment.aggregate');
  prisma.payment.count = operation('payment.count');
  prisma.payment.findMany = operation('payment.findMany');
  prisma.feeRecord.aggregate = operation('feeRecord.aggregate');
  prisma.feeRecord.findMany = operation('feeRecord.findMany');
  prisma.feeRecord.groupBy = operation('feeRecord.groupBy');
  prisma.installment.aggregate = operation('installment.aggregate');
  prisma.installment.count = operation('installment.count');
  prisma.$transaction = async (operations) => {
    calls.push({ method: '$transaction', operations });
    return transactionResults;
  };

  return {
    calls,
    restore() {
      prisma.$transaction = originals.transaction;
      prisma.payment.aggregate = originals.paymentAggregate;
      prisma.payment.count = originals.paymentCount;
      prisma.payment.findMany = originals.paymentFindMany;
      prisma.feeRecord.aggregate = originals.feeRecordAggregate;
      prisma.feeRecord.findMany = originals.feeRecordFindMany;
      prisma.feeRecord.groupBy = originals.feeRecordGroupBy;
      prisma.installment.aggregate = originals.installmentAggregate;
      prisma.installment.count = originals.installmentCount;
    },
  };
}

test('dashboard overview splits outstanding balances and returns clear metrics', async () => {
  const paidAt = new Date('2026-07-01T10:00:00.000Z');
  const dueDate = new Date('2026-07-15T10:00:00.000Z');
  const recentPayment = {
    id: 'payment-1',
    reference: 'ref-1',
    transactionReference: 'txn-1',
    amount: decimal(50),
    status: 'SUCCESS',
    paidAt,
    createdAt: paidAt,
    installment: {
      id: 'installment-1',
      sequence: 1,
      dueDate,
      feeRecord: {
        id: 'fee-record-1',
        title: 'First Term',
        status: 'PARTIALLY_PAID',
        student: {
          id: 'student-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          parentName: 'Ann Lovelace',
        },
      },
    },
  };
  const feeRecordsForBalances = [
    {
      totalAmount: decimal(200),
      installments: [
        {
          payments: [{ amount: decimal(100) }],
        },
      ],
    },
    {
      totalAmount: decimal(200),
      installments: [{ payments: [] }],
    },
    {
      totalAmount: decimal(250),
      installments: [{ payments: [] }],
    },
    {
      totalAmount: decimal(350),
      installments: [
        {
          payments: [{ amount: decimal(350) }],
        },
      ],
    },
  ];
  const { calls, restore } = mockDashboardPrisma([
    feeRecordsForBalances,
    [
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'PARTIALLY_PAID', _count: { _all: 1 } },
      { status: 'PAID', _count: { _all: 1 } },
    ],
    { _sum: { amount: decimal(250) } },
    3,
    6,
    2,
    8,
    [recentPayment],
  ]);

  try {
    const overview = await dashboardService.getOverview('school-1', {
      recentPaymentsPagination: {
        page: 2,
        limit: 3,
        skip: 3,
      },
    });

    assert.equal(
      calls.find((call) => call.method === '$transaction').operations.length,
      8
    );
    assert.deepEqual(
      calls.find((call) => call.method === 'payment.findMany').args.orderBy,
      [
        { paidAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ]
    );
    assert.equal(
      calls.find((call) => call.method === 'payment.findMany').args.skip,
      3
    );
    assert.equal(
      calls.find((call) => call.method === 'payment.findMany').args.take,
      3
    );
    assert.deepEqual(overview.totals, {
      totalBilled: 1000,
      totalCollected: 450,
      totalOutstandingBalance: 550,
      fullyUnpaidOutstandingBalance: 450,
      partiallyPaidOutstandingBalance: 100,
      partiallyPaidFeeRecordsCount: 1,
      partiallyPaidFeeRecordsPercentage: 25,
      collectionRate: 45,
      overdueAmount: 250,
      dueSoonInstallmentsCount: 3,
      dueSoonInstallmentsPercentage: 50,
      pendingPaymentsCount: 2,
      pendingPaymentsPercentage: 25,
    });
    assert.deepEqual(overview.feeRecordStatusBreakdown, {
      pending: 50,
      partiallyPaid: 25,
      paid: 25,
      overdue: 0,
    });
    assert.deepEqual(overview.recentPaymentsPagination, {
      page: 2,
      limit: 3,
      total: 8,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    assert.equal(overview.recentPayments[0].amount, 50);
  } finally {
    restore();
  }
});

test('dashboard overview returns zero percentages when denominators are empty', async () => {
  const { restore } = mockDashboardPrisma([
    [],
    [],
    { _sum: { amount: null } },
    0,
    0,
    0,
    0,
    [],
  ]);

  try {
    const overview = await dashboardService.getOverview('school-1');

    assert.deepEqual(overview.totals, {
      totalBilled: 0,
      totalCollected: 0,
      totalOutstandingBalance: 0,
      fullyUnpaidOutstandingBalance: 0,
      partiallyPaidOutstandingBalance: 0,
      partiallyPaidFeeRecordsCount: 0,
      partiallyPaidFeeRecordsPercentage: 0,
      collectionRate: 0,
      overdueAmount: 0,
      dueSoonInstallmentsCount: 0,
      dueSoonInstallmentsPercentage: 0,
      pendingPaymentsCount: 0,
      pendingPaymentsPercentage: 0,
    });
    assert.deepEqual(overview.feeRecordStatusBreakdown, {
      pending: 0,
      partiallyPaid: 0,
      paid: 0,
      overdue: 0,
    });
    assert.deepEqual(overview.recentPaymentsPagination, {
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  } finally {
    restore();
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../dist/config/database').default;
const { studentService } = require('../dist/modules/students/student.service');

function mockStudentPrisma(transactionResults) {
  const originals = {
    transaction: prisma.$transaction,
    findMany: prisma.student.findMany,
    count: prisma.student.count,
  };
  const calls = [];
  const operation = (method) => (args) => {
    calls.push({ method, args });
    return { method, args };
  };

  prisma.student.findMany = operation('student.findMany');
  prisma.student.count = operation('student.count');
  prisma.$transaction = async (operations) => {
    calls.push({ method: '$transaction', operations });
    return transactionResults;
  };

  return {
    calls,
    restore() {
      prisma.$transaction = originals.transaction;
      prisma.student.findMany = originals.findMany;
      prisma.student.count = originals.count;
    },
  };
}

test('getStudentsPaginated filters students by first or last name search terms', async () => {
  const student = {
    id: 'student-1',
    schoolId: 'school-1',
    firstName: 'Jane',
    lastName: 'Doe',
  };
  const { calls, restore } = mockStudentPrisma([[student], 1]);

  try {
    const result = await studentService.getStudentsPaginated(
      'school-1',
      { skip: 10, limit: 5 },
      { search: ' Jane Doe ' }
    );
    const expectedWhere = {
      schoolId: 'school-1',
      AND: [
        {
          OR: [
            { firstName: { contains: 'Jane', mode: 'insensitive' } },
            { lastName: { contains: 'Jane', mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { firstName: { contains: 'Doe', mode: 'insensitive' } },
            { lastName: { contains: 'Doe', mode: 'insensitive' } },
          ],
        },
      ],
    };

    assert.deepEqual(result, { data: [student], total: 1 });
    assert.deepEqual(
      calls.find((call) => call.method === 'student.findMany').args,
      {
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 5,
      }
    );
    assert.deepEqual(
      calls.find((call) => call.method === 'student.count').args,
      { where: expectedWhere }
    );
  } finally {
    restore();
  }
});

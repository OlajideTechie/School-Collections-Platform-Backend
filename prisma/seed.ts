import process from 'process';
import { PrismaClient, InstallmentStatus, PaymentStatus, NotificationChannel, NotificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create a School
  const school = await prisma.school.upsert({
    where: { id: 'sample-school-id' },
    update: {},
    create: {
      id: 'sample-school-id',
      name: 'St. Andrews Excellence Academy',
      email: 'admin@standrews.edu',
      phone: '+1234567890',
    },
  });

  // 2. Create a Student
  const student = await prisma.student.upsert({
    where: { id: 'sample-student-id' },
    update: {},
    create: {
      id: 'sample-student-id',
      schoolId: school.id,
      firstName: 'Jane',
      lastName: 'Doe',
      parentName: 'John Doe',
      parentPhone: '+1987654321',
      parentEmail: 'john.doe@example.com',
    },
  });

  // 3. Create a Collection Plan
  const collectionPlan = await prisma.collectionPlan.upsert({
    where: { id: 'sample-plan-id' },
    update: {},
    create: {
      id: 'sample-plan-id',
      studentId: student.id,
      title: 'Academic Year 2024/2025 - Term 1',
      totalAmount: 1500.00,
      installmentCount: 3,
    },
  });

  // 4. Create Installments
  const installment1 = await prisma.installment.upsert({
    where: { id: 'sample-inst-1' },
    update: {},
    create: {
      id: 'sample-inst-1',
      collectionPlanId: collectionPlan.id,
      sequence: 1,
      amount: 500.00,
      dueDate: new Date('2024-09-01'),
      status: InstallmentStatus.PAID,
    },
  });

  await prisma.installment.upsert({
    where: { id: 'sample-inst-2' },
    update: {},
    create: {
      id: 'sample-inst-2',
      collectionPlanId: collectionPlan.id,
      sequence: 2,
      amount: 500.00,
      dueDate: new Date('2024-10-01'),
      status: InstallmentStatus.PENDING,
    },
  });

  // 5. Create a Payment for the first installment
  const payment = await prisma.payment.upsert({
    where: { id: 'sample-payment-id' },
    update: {},
    create: {
      id: 'sample-payment-id',
      installmentId: installment1.id,
      reference: 'PAY-REF-001',
      transactionReference: 'TX_9988776655',
      amount: 500.00,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  // 6. Create a Notification record
  await prisma.notification.upsert({
    where: { id: 'sample-notif-id' },
    update: {},
    create: {
      id: 'sample-notif-id',
      paymentId: payment.id,
      channel: NotificationChannel.EMAIL,
      recipient: 'john.doe@example.com',
      message: 'Thank you for your payment of 500.00 for Jane Doe.',
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import cron, { ScheduledTask } from 'node-cron';
import { paymentService } from '../modules/payments/payment.service';

let paymentVerificationTask: ScheduledTask | null = null;
let jobIsRunning = false;

export function startPaymentVerificationJob(): ScheduledTask | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (paymentVerificationTask) {
    return paymentVerificationTask;
  }

  // Schedule the job to run every minute
  paymentVerificationTask = cron.schedule('*/1 * * * *', async () => {
    if (jobIsRunning) {
      console.warn('[PaymentVerificationJob] Previous run still in progress. Skipping this cycle.');
      return;
    }

    jobIsRunning = true;
    console.info('[PaymentVerificationJob] Started.');

    try {
      const summary = await paymentService.verifyPendingPayments();
      console.info('[PaymentVerificationJob] Finished successfully.', summary);
    } catch (error) {
      console.error('[PaymentVerificationJob] Failed.', error);
    } finally {
      jobIsRunning = false;
      console.info('[PaymentVerificationJob] Cycle complete.');
    }
  });

  return paymentVerificationTask;
}
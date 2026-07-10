import cron, { ScheduledTask } from 'node-cron';
import { paymentService } from '../modules/payments/payment.service';

let paymentInstructionTask: ScheduledTask | null = null;
let jobIsRunning = false;

export function startPaymentInstructionGenerationJob(): ScheduledTask | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (paymentInstructionTask) {
    return paymentInstructionTask;
  }

  paymentInstructionTask = cron.schedule('*/1 * * * *', async () => {
    if (jobIsRunning) {
      console.warn('[PaymentInstructionJob] Previous run still in progress. Skipping this cycle.');
      return;
    }

    jobIsRunning = true;
    console.info('[PaymentInstructionJob] Started.');

    try {
      const summary = await paymentService.generateVirtualAccountsForDueInstallments();
      console.info('[PaymentInstructionJob] Finished successfully.', summary);
    } catch (error) {
      console.error('[PaymentInstructionJob] Failed.', error);
    } finally {
      jobIsRunning = false;
      console.info('[PaymentInstructionJob] Cycle complete.');
    }
  });

  return paymentInstructionTask;
}

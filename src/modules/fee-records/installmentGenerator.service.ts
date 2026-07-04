/**
 * Generates installment amounts and due dates.
 * Splits totalAmount evenly across count; remainder goes to the last installment.
 */
export const InstallmentGeneratorService = {
  generate(totalAmount: number, count: number, startDate?: Date, dueDate?: Date) {
    // Work in cents to avoid floating point issues
    const totalCents = Math.round(totalAmount * 100);
    const base = Math.floor(totalCents / count);
    const remainder = totalCents - base * count;

    const installments = [];
    const collectionStart = startDate ? new Date(startDate) : new Date();
    const collectionDue = dueDate ? new Date(dueDate) : undefined;

    for (let i = 0; i < count; i++) {
      const installmentNumber = i + 1;
      let cents = base;
      if (i === count - 1) cents += remainder;

      const amount = cents / 100;
      const installmentDueDate = new Date(collectionStart);

      if (collectionDue && count > 1) {
        const interval = (collectionDue.getTime() - collectionStart.getTime()) / (count - 1);
        installmentDueDate.setTime(collectionStart.getTime() + interval * i);
      } else {
        installmentDueDate.setMonth(installmentDueDate.getMonth() + i);
      }

      installments.push({ installmentNumber, amount, dueDate: installmentDueDate });
    }

    return installments;
  },
};

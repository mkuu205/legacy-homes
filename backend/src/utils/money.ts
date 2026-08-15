import { Prisma } from '@prisma/client';

export const WATER_UNIT_RATE = new Prisma.Decimal('250.00');

export function toMoneyNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function toMoneyDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function roundMoney(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export function calculateWaterAmount(unitsConsumed: number | string | Prisma.Decimal): Prisma.Decimal {
  return roundMoney(new Prisma.Decimal(unitsConsumed).mul(WATER_UNIT_RATE));
}

export function calculateBalance(totalAmount: Prisma.Decimal | number | string, amountPaid: Prisma.Decimal | number | string): Prisma.Decimal {
  const balance = new Prisma.Decimal(totalAmount).minus(new Prisma.Decimal(amountPaid));
  return balance.greaterThan(0) ? balance.toDecimalPlaces(2) : new Prisma.Decimal(0);
}

export function calculateBillStatus(
  totalAmount: Prisma.Decimal | number | string,
  amountPaid: Prisma.Decimal | number | string,
  overdue: boolean,
): 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' {
  const total = new Prisma.Decimal(totalAmount);
  const paid = new Prisma.Decimal(amountPaid);
  if (paid.greaterThanOrEqualTo(total)) return 'PAID';
  if (paid.greaterThan(0)) return 'PARTIAL';
  return overdue ? 'OVERDUE' : 'UNPAID';
}

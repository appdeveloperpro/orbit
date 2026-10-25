export interface CommissionRate {
  level: number;
  rateBps: number;
}

export interface CommissionEntry {
  id: string;
  referenceId: string;
  sourceMemberId: string;
  beneficiaryMemberId: string;
  incomeType: 'turnover-pool' | 'unilevel' | 'rank-reward';
  level: number;
  eligibleAmount: number;
  rateBps: number;
  commissionAmount: number;
  createdAt: string;
}

export interface SimulatedOrder {
  referenceId: string;
  sourceMemberId: string;
  orderType: 'joining' | 'turnover';
  qualifyingAmount: number;
  commissionTotal: number;
  turnoverPoolTotal: number;
  totalAllocated: number;
  commissionEntries: number;
  unilevelEntries: number;
  turnoverPoolEntries: number;
  createdAt: string;
  status: 'processed';
}

export type PayoutStatus = 'pending' | 'on-hold' | 'paid';

export interface PayoutEntry {
  id: string;
  memberId: string;
  sourceMemberId: string;
  referenceId: string;
  incomeType: 'turnover-pool' | 'unilevel' | 'rank-reward';
  level: number;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  paidAt: string | null;
}

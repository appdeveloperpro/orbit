import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MembersService } from '../members/members.service';
import { CommissionEntry, CommissionRate, PayoutEntry, PayoutStatus, SimulatedOrder } from './commission.model';

export const JOINING_AMOUNT = 100;
export const TURNOVER_POOL_BPS = 2000;
const MAX_ELIGIBLE_LEVELS = 10;
const DEFAULT_RATES_BPS = [1500, 1000, 500, 300, 200, 100, 100, 100, 100, 100];

@Injectable()
export class CommissionService {
  private rates: CommissionRate[] = DEFAULT_RATES_BPS.map((rateBps, index) => ({ level: index + 1, rateBps }));
  private readonly ledger: CommissionEntry[] = [];
  private readonly orders: SimulatedOrder[] = [];
  private readonly payouts: PayoutEntry[] = [];
  private readonly processedReferences = new Set<string>();

  constructor(private readonly membersService: MembersService) {
    for (const member of membersService.list().filter((candidate) => candidate.sponsorId !== null)) {
      this.simulate(member.id, JOINING_AMOUNT, `join-${member.id}`, 'joining');
    }
  }

  getRates(): CommissionRate[] {
    return this.rates;
  }

  updateRates(rateBps: number[]): CommissionRate[] {
    this.rates = rateBps.map((rate, index) => ({ level: index + 1, rateBps: rate }));
    return this.rates;
  }

  getLedger(): CommissionEntry[] {
    return this.ledger;
  }

  getOrders(): SimulatedOrder[] {
    return this.orders;
  }

  getPayouts(): PayoutEntry[] {
    return this.payouts;
  }

  ensureRankReward(awardId: string, memberId: string, amount: number): void {
    const referenceId = rankRewardReference(awardId);
    if (this.payouts.some((payout) => payout.referenceId === referenceId)) {
      return;
    }

    const createdAt = new Date().toISOString();
    const entry: CommissionEntry = {
      id: randomUUID(),
      referenceId,
      sourceMemberId: memberId,
      beneficiaryMemberId: memberId,
      incomeType: 'rank-reward',
      level: 0,
      eligibleAmount: amount,
      rateBps: 0,
      commissionAmount: amount,
      createdAt,
    };
    this.ledger.push(entry);
    this.payouts.push({
      id: entry.id,
      memberId,
      sourceMemberId: memberId,
      referenceId,
      incomeType: 'rank-reward',
      level: 0,
      amount,
      status: 'pending',
      createdAt,
      paidAt: null,
    });
  }

  isRankRewardPaid(awardId: string): boolean {
    return this.payouts.some(
      (payout) => payout.referenceId === rankRewardReference(awardId) && payout.status === 'paid',
    );
  }

  payRankReward(awardId: string): void {
    const payout = this.payouts.find(
      (candidate) => candidate.referenceId === rankRewardReference(awardId),
    );
    if (!payout) {
      throw new NotFoundException(`Rank reward payout ${awardId} was not found`);
    }
    if (payout.status === 'paid') {
      return;
    }
    if (payout.status === 'on-hold') {
      throw new ConflictException('Release the held rank reward before fulfilling it');
    }
    if (payout.amount < 10) {
      throw new ConflictException('Rank reward payouts cannot be below the $10 minimum withdrawal');
    }

    payout.status = 'paid';
    payout.paidAt = new Date().toISOString();
  }

  updatePayoutStatus(id: string, status: PayoutStatus): PayoutEntry {
    const payout = this.payouts.find((candidate) => candidate.id === id);
    if (!payout) {
      throw new NotFoundException(`Payout ${id} was not found`);
    }

    if (payout.status === 'paid' && status === 'paid') {
      return payout;
    }

    if (payout.status === 'paid') {
      throw new ConflictException('Completed demo payouts cannot be reopened');
    }
    if (status === 'paid') {
      if (payout.status === 'on-hold') {
        throw new ConflictException('Release a held allocation before withdrawing the member balance');
      }
      const memberPending = this.payouts.filter(
        (candidate) => candidate.memberId === payout.memberId && candidate.status === 'pending',
      );
      const balanceCents = memberPending.reduce((total, candidate) => total + Math.round(candidate.amount * 100), 0);
      if (balanceCents < 1000) {
        throw new ConflictException('The minimum withdrawal is $10.00; this member has not reached it yet');
      }

      const paidAt = new Date().toISOString();
      for (const candidate of memberPending) {
        candidate.status = 'paid';
        candidate.paidAt = paidAt;
      }
      return payout;
    }
    payout.status = status;
    payout.paidAt = null;
    return payout;
  }

  simulate(sourceMemberId: string, amount: number, referenceId: string, orderType: 'joining' | 'turnover' = 'turnover'): {
    referenceId: string;
    sourceMemberId: string;
    orderType: 'joining' | 'turnover';
    eligibleAmount: number;
    commissions: CommissionEntry[];
    turnoverPoolEntries: CommissionEntry[];
    totalCommission: number;
    turnoverPoolTotal: number;
    totalAllocated: number;
  } {
    if (this.processedReferences.has(referenceId)) {
      throw new ConflictException(`Reference ${referenceId} has already been simulated`);
    }

    const sourceMember = this.membersService.getById(sourceMemberId);
    if (sourceMember.archivedAt) {
      throw new BadRequestException('Archived members cannot generate qualifying turnover');
    }
    if (orderType === 'turnover' && sourceMember.status !== 'active') {
      throw new BadRequestException('Inactive members cannot generate qualifying turnover');
    }
    const eligibleAmountCents = Math.round(amount * 100);
    const upline = this.membersService.getUpline(sourceMemberId).slice(0, MAX_ELIGIBLE_LEVELS);
    const commissions: CommissionEntry[] = [];
    const createdAt = new Date().toISOString();

    for (const [index, sponsor] of upline.entries()) {
      const rate = this.rates[index];
      if (!rate) {
        break;
      }
      if (rate.rateBps === 0 || sponsor.status !== 'active') {
        continue;
      }

      const commissionCents = Math.round((eligibleAmountCents * rate.rateBps) / 10000);
      if (commissionCents === 0) {
        continue;
      }
      commissions.push({
        id: randomUUID(),
        referenceId,
        sourceMemberId,
        beneficiaryMemberId: sponsor.id,
        incomeType: 'unilevel',
        level: index + 1,
        eligibleAmount: eligibleAmountCents / 100,
        rateBps: rate.rateBps,
        commissionAmount: commissionCents / 100,
        createdAt,
      });
    }

    const eligiblePoolUplines = upline.filter((sponsor) => sponsor.status === 'active');
    const turnoverPoolCents = eligiblePoolUplines.length
      ? Math.round((eligibleAmountCents * TURNOVER_POOL_BPS) / 10000)
      : 0;
    const poolShareCents = eligiblePoolUplines.length
      ? Math.floor(turnoverPoolCents / eligiblePoolUplines.length)
      : 0;
    const poolRemainderCents = eligiblePoolUplines.length ? turnoverPoolCents % eligiblePoolUplines.length : 0;
    const poolEntries = eligiblePoolUplines.map((sponsor, index): CommissionEntry => {
      const shareCents = poolShareCents + (index < poolRemainderCents ? 1 : 0);
      return {
        id: randomUUID(),
        referenceId,
        sourceMemberId,
        beneficiaryMemberId: sponsor.id,
        incomeType: 'turnover-pool',
        level: upline.findIndex((candidate) => candidate.id === sponsor.id) + 1,
        eligibleAmount: eligibleAmountCents / 100,
        rateBps: TURNOVER_POOL_BPS,
        commissionAmount: shareCents / 100,
        createdAt,
      };
    }).filter((entry) => entry.commissionAmount > 0);
    const totalCommission =
      commissions.reduce((total, entry) => total + Math.round(entry.commissionAmount * 100), 0) / 100;
    const turnoverPoolTotal = poolEntries.reduce(
      (total, entry) => total + Math.round(entry.commissionAmount * 100),
      0,
    ) / 100;
    const allEntries = [...commissions, ...poolEntries];
    const totalAllocated = totalCommission + turnoverPoolTotal;

    this.processedReferences.add(referenceId);
    this.ledger.push(...allEntries);
    this.orders.push({
      referenceId,
      sourceMemberId: sourceMember.id,
      orderType,
      qualifyingAmount: eligibleAmountCents / 100,
      commissionTotal: totalCommission,
      turnoverPoolTotal,
      totalAllocated,
      commissionEntries: allEntries.length,
      unilevelEntries: commissions.length,
      turnoverPoolEntries: poolEntries.length,
      createdAt,
      status: 'processed',
    });
    this.payouts.push(
      ...allEntries.map((entry): PayoutEntry => ({
        id: entry.id,
        memberId: entry.beneficiaryMemberId,
        sourceMemberId,
        referenceId,
        incomeType: entry.incomeType,
        level: entry.level,
        amount: entry.commissionAmount,
        status: 'pending',
        createdAt,
        paidAt: null,
      })),
    );
    return {
      referenceId,
      sourceMemberId: sourceMember.id,
      orderType,
      eligibleAmount: eligibleAmountCents / 100,
      commissions,
      turnoverPoolEntries: poolEntries,
      totalCommission,
      turnoverPoolTotal,
      totalAllocated,
    };
  }
}

function rankRewardReference(awardId: string): string {
  return `reward-${awardId.replace(':', '-')}`;
}

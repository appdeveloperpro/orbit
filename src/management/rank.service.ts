import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionService } from '../commissions/commission.service';
import { MembersService } from '../members/members.service';
import { RankProgress, RankRule, RewardAward, RewardAwardStatus } from './rank.model';

interface MemberVolume {
  personalVolume: number;
  groupVolume: number;
}

const RANKS: Omit<RankRule, 'id'>[] = [
  { name: 'Star', requiredDirectReferrals: 3, requiredDirectRank: null, rewardTitle: 'Star reward', rewardAmount: 10 },
  { name: 'Double Star', requiredDirectReferrals: 3, requiredDirectRank: 'Star', rewardTitle: 'Double Star reward', rewardAmount: 30 },
  { name: 'Triple Star', requiredDirectReferrals: 3, requiredDirectRank: 'Double Star', rewardTitle: 'Triple Star reward', rewardAmount: 90 },
  { name: 'Fourth Star', requiredDirectReferrals: 3, requiredDirectRank: 'Triple Star', rewardTitle: 'Fourth Star reward', rewardAmount: 270 },
  { name: 'Five Star', requiredDirectReferrals: 3, requiredDirectRank: 'Fourth Star', rewardTitle: 'Five Star reward', rewardAmount: 810 },
  { name: 'Six Star', requiredDirectReferrals: 3, requiredDirectRank: 'Five Star', rewardTitle: 'Six Star reward', rewardAmount: 2430 },
  { name: 'Seven Star', requiredDirectReferrals: 3, requiredDirectRank: 'Six Star', rewardTitle: 'Seven Star reward', rewardAmount: 7290 },
  { name: 'Eight Star', requiredDirectReferrals: 3, requiredDirectRank: 'Seven Star', rewardTitle: 'Eight Star reward', rewardAmount: 21870 },
  { name: 'Nine Star', requiredDirectReferrals: 3, requiredDirectRank: 'Eight Star', rewardTitle: 'Nine Star reward', rewardAmount: 65610 },
  { name: 'Ten Star', requiredDirectReferrals: 3, requiredDirectRank: 'Nine Star', rewardTitle: 'Ten Star reward', rewardAmount: 196830 },
];

const UNRANKED: RankRule = {
  id: 'rank-unranked',
  name: 'Unranked',
  requiredDirectReferrals: 3,
  requiredDirectRank: null,
  rewardTitle: 'No rank reward',
  rewardAmount: 0,
};

@Injectable()
export class RankService {
  private rules: RankRule[] = RANKS.map((rule, index) => ({ ...rule, id: `rank-${index + 1}` }));
  private readonly awardStatuses = new Map<string, RewardAwardStatus>();
  private readonly earnedAwards = new Map<string, RewardAward>();
  private readonly volumes: Record<string, MemberVolume> = {
    'mem-001': { personalVolume: 500, groupVolume: 15000 },
    'mem-002': { personalVolume: 300, groupVolume: 2700 },
    'mem-003': { personalVolume: 150, groupVolume: 800 },
    'mem-004': { personalVolume: 100, groupVolume: 350 },
    'mem-005': { personalVolume: 75, groupVolume: 0 },
    'mem-006': { personalVolume: 100, groupVolume: 180 },
    'mem-007': { personalVolume: 200, groupVolume: 0 },
    'mem-008': { personalVolume: 80, groupVolume: 0 },
  };

  constructor(
    private readonly membersService: MembersService,
    private readonly commissionService: CommissionService,
  ) {}

  getRules(): RankRule[] {
    return this.rules;
  }

  updateRules(rules: Omit<RankRule, 'id' | 'requiredDirectReferrals' | 'requiredDirectRank'>[]): RankRule[] {
    this.rules = rules.map((rule, index) => ({
      ...this.rules[index],
      ...rule,
    }));
    return this.rules;
  }

  getProgress(): RankProgress[] {
    const members = this.membersService.list();
    const membersById = new Map(members.map((member) => [member.id, member]));
    const directMembers = new Map<string, typeof members>();
    for (const member of members) {
      if (member.sponsorId) {
        const direct = directMembers.get(member.sponsorId) ?? [];
        direct.push(member);
        directMembers.set(member.sponsorId, direct);
      }
    }

    const orderVolume = new Map<string, MemberVolume>();
    for (const order of this.commissionService.getOrders()) {
      const source = membersById.get(order.sourceMemberId);
      if (!source) continue;

      addVolume(orderVolume, source.id, 'personalVolume', order.qualifyingAmount);
      addVolume(orderVolume, source.id, 'groupVolume', order.qualifyingAmount);
      let sponsorId = source.sponsorId;
      const visited = new Set<string>([source.id]);
      while (sponsorId && !visited.has(sponsorId)) {
        visited.add(sponsorId);
        const sponsor = membersById.get(sponsorId);
        if (!sponsor) break;
        addVolume(orderVolume, sponsor.id, 'groupVolume', order.qualifyingAmount);
        sponsorId = sponsor.sponsorId;
      }
    }

    const rankIndexes = new Map(members.map((member) => [member.id, -1]));
    const qualifyingDirects = new Map<string, number>();
    for (let rankIndex = 0; rankIndex < this.rules.length; rankIndex += 1) {
      const rule = this.rules[rankIndex];
      for (const member of members) {
        if (member.status !== 'active') continue;
        const qualifiedCount = (directMembers.get(member.id) ?? []).filter((direct) => {
          if (direct.status !== 'active') return false;
          return rankIndex === 0 || (rankIndexes.get(direct.id) ?? -1) >= rankIndex - 1;
        }).length;
        if (rankIndex === 0 || (rankIndexes.get(member.id) ?? -1) < rankIndex) {
          qualifyingDirects.set(`${member.id}:${rankIndex}`, qualifiedCount);
        }
        if (qualifiedCount >= rule.requiredDirectReferrals) {
          rankIndexes.set(member.id, rankIndex);
        }
      }
    }

    return members.map((member) => {
      const rankIndex = rankIndexes.get(member.id) ?? -1;
      const currentRank = rankIndex >= 0 ? this.rules[rankIndex] : UNRANKED;
      const nextRank = this.rules[rankIndex + 1] ?? null;
      const qualifyingDirectReferrals = nextRank
        ? qualifyingDirects.get(`${member.id}:${rankIndex + 1}`) ?? 0
        : 0;
      const directReferrals = directMembers.get(member.id)?.length ?? 0;
      const baseline = this.volumes[member.id] ?? { personalVolume: 0, groupVolume: 0 };
      const simulated = orderVolume.get(member.id) ?? { personalVolume: 0, groupVolume: 0 };
      const required = nextRank?.requiredDirectReferrals ?? 0;

      return {
        memberId: member.id,
        name: member.name,
        email: member.email,
        status: member.status,
        personalVolume: baseline.personalVolume + simulated.personalVolume,
        groupVolume: baseline.groupVolume + simulated.groupVolume,
        directReferrals,
        qualifyingDirectReferrals,
        currentRank,
        nextRank,
        progressPercent: required ? Math.min(100, Math.round((qualifyingDirectReferrals / required) * 100)) : 100,
      };
    });
  }

  getAwards(): RewardAward[] {
    for (const member of this.getProgress()) {
      const currentRankIndex = this.rules.findIndex((rule) => rule.id === member.currentRank.id);
      for (const rule of this.rules.slice(0, currentRankIndex + 1)) {
        const id = `${member.memberId}:${rule.id}`;
        if (!this.earnedAwards.has(id)) {
          const award: RewardAward = {
            id,
            memberId: member.memberId,
            memberName: member.name,
            rankName: rule.name,
            rewardTitle: rule.rewardTitle,
            rewardAmount: rule.rewardAmount,
            status: 'pending',
          };
          this.earnedAwards.set(id, award);
          this.commissionService.ensureRankReward(id, member.memberId, rule.rewardAmount);
        }
      }
    }

    return [...this.earnedAwards.values()].map((award) => {
      const status = this.commissionService.isRankRewardPaid(award.id)
        ? 'fulfilled'
        : this.awardStatuses.get(award.id) ?? award.status;
      return { ...award, status };
    });
  }

  updateAwardStatus(id: string, status: RewardAwardStatus): RewardAward {
    const award = this.getAwards().find((candidate) => candidate.id === id);
    if (!award) {
      throw new NotFoundException(`Reward award ${id} was not found`);
    }
    if (award.status === 'fulfilled' && status !== 'fulfilled') {
      throw new ConflictException('Fulfilled demo rewards cannot be reopened');
    }
    if (status === 'fulfilled') {
      this.commissionService.payRankReward(id);
    }
    this.awardStatuses.set(id, status);
    return { ...award, status };
  }
}

function addVolume(
  totals: Map<string, MemberVolume>,
  memberId: string,
  field: keyof MemberVolume,
  amount: number,
): void {
  const volume = totals.get(memberId) ?? { personalVolume: 0, groupVolume: 0 };
  volume[field] += amount;
  totals.set(memberId, volume);
}

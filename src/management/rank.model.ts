export interface RankRule {
  id: string;
  name: string;
  requiredDirectReferrals: number;
  requiredDirectRank: string | null;
  rewardTitle: string;
  rewardAmount: number;
}

export interface RankProgress {
  memberId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  personalVolume: number;
  groupVolume: number;
  directReferrals: number;
  qualifyingDirectReferrals: number;
  currentRank: RankRule;
  nextRank: RankRule | null;
  progressPercent: number;
}

export type RewardAwardStatus = 'pending' | 'approved' | 'fulfilled';

export interface RewardAward {
  id: string;
  memberId: string;
  memberName: string;
  rankName: string;
  rewardTitle: string;
  rewardAmount: number;
  status: RewardAwardStatus;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  sponsorId: string | null;
  status: 'active' | 'inactive';
  archivedAt?: string | null;
}

export interface MemberTreeNode extends Member {
  children: MemberTreeNode[];
}

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

export interface SimulationResult {
  referenceId: string;
  sourceMemberId: string;
  orderType: 'joining' | 'turnover';
  eligibleAmount: number;
  commissions: CommissionEntry[];
  turnoverPoolEntries: CommissionEntry[];
  totalCommission: number;
  turnoverPoolTotal: number;
  totalAllocated: number;
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

export interface PayoutEntry {
  id: string;
  memberId: string;
  sourceMemberId: string;
  referenceId: string;
  incomeType: 'turnover-pool' | 'unilevel' | 'rank-reward';
  level: number;
  amount: number;
  status: 'pending' | 'on-hold' | 'paid';
  createdAt: string;
  paidAt: string | null;
}

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

export interface RewardAward {
  id: string;
  memberId: string;
  memberName: string;
  rankName: string;
  rewardTitle: string;
  rewardAmount: number;
  status: 'pending' | 'approved' | 'fulfilled';
}

export interface AdminSettings {
  workspaceName: string;
  adminName: string;
  adminEmail: string;
}

const TOKEN_KEY = 'orbit-demo-token';
let accessToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (payload.message) {
        message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      }
    } catch {
      message = response.statusText || message;
    }
    if (response.status === 401) {
      setAccessToken(null);
      window.dispatchEvent(new Event('demo-session-expired'));
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

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

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Member, MemberTreeNode } from './member.model';

@Injectable()
export class MembersService {
  private readonly members: Member[] = [
    { id: 'mem-001', name: 'Avery Morgan', email: 'avery@example.test', joinedAt: '2026-01-03', sponsorId: null, status: 'active' },
    { id: 'mem-002', name: 'Blake Chen', email: 'blake@example.test', joinedAt: '2026-01-08', sponsorId: 'mem-001', status: 'active' },
    { id: 'mem-003', name: 'Casey Diaz', email: 'casey@example.test', joinedAt: '2026-01-11', sponsorId: 'mem-001', status: 'active' },
    { id: 'mem-004', name: 'Dev Shah', email: 'dev@example.test', joinedAt: '2026-01-15', sponsorId: 'mem-002', status: 'active' },
    { id: 'mem-005', name: 'Ellis Li', email: 'ellis@example.test', joinedAt: '2026-01-18', sponsorId: 'mem-002', status: 'active' },
    { id: 'mem-006', name: 'Frankie Roy', email: 'frankie@example.test', joinedAt: '2026-01-21', sponsorId: 'mem-003', status: 'inactive' },
    { id: 'mem-007', name: 'Gray Park', email: 'gray@example.test', joinedAt: '2026-01-25', sponsorId: 'mem-004', status: 'active' },
    { id: 'mem-008', name: 'Harper Reed', email: 'harper@example.test', joinedAt: '2026-01-29', sponsorId: 'mem-006', status: 'active' },
  ];

  list(): Member[] {
    return this.members;
  }

  getById(id: string): Member {
    const member = this.members.find((candidate) => candidate.id === id);
    if (!member) {
      throw new NotFoundException(`Member ${id} was not found`);
    }
    return member;
  }

  create(name: string, email: string, sponsorId?: string): Member {
    if (this.members.some((member) => member.email.toLowerCase() === email.toLowerCase())) {
      throw new ConflictException(`A member with email ${email} already exists`);
    }
    if (sponsorId) {
      const sponsor = this.getById(sponsorId);
      if (sponsor.archivedAt) {
        throw new ConflictException('Archived members cannot sponsor new members');
      }
    }

    const nextId = Math.max(...this.members.map((member) => Number(member.id.slice(4)))) + 1;
    const member: Member = {
      id: `mem-${String(nextId).padStart(3, '0')}`,
      name,
      email,
      joinedAt: new Date().toISOString().slice(0, 10),
      sponsorId: sponsorId ?? null,
      status: 'active',
      archivedAt: null,
    };
    this.members.push(member);
    return member;
  }

  update(id: string, name: string, email: string, sponsorId: string | null): Member {
    const member = this.getById(id);
    if (member.archivedAt) {
      throw new ConflictException('Restore this member before editing their profile');
    }
    if (this.members.some((candidate) => candidate.id !== id && candidate.email.toLowerCase() === email.toLowerCase())) {
      throw new ConflictException(`A member with email ${email} already exists`);
    }
    this.validateSponsorChange(id, sponsorId);

    member.name = name;
    member.email = email;
    member.sponsorId = sponsorId;
    return member;
  }

  updateStatus(id: string, status: Member['status']): Member {
    const member = this.getById(id);
    if (member.archivedAt) {
      throw new ConflictException('Restore this member before changing their status');
    }
    member.status = status;
    return member;
  }

  archive(id: string): Member {
    const member = this.getById(id);
    if (!member.archivedAt) {
      member.status = 'inactive';
      member.archivedAt = new Date().toISOString();
    }
    return member;
  }

  restore(id: string): Member {
    const member = this.getById(id);
    member.archivedAt = null;
    return member;
  }

  private validateSponsorChange(memberId: string, sponsorId: string | null): void {
    if (!sponsorId) return;
    if (sponsorId === memberId) {
      throw new ConflictException('A member cannot sponsor themselves');
    }

    let current = this.getById(sponsorId);
    if (current.archivedAt) {
      throw new ConflictException('Archived members cannot sponsor new members');
    }
    const visited = new Set<string>();
    while (true) {
      if (current.id === memberId) {
        throw new ConflictException('A member cannot be moved under one of their descendants');
      }
      if (visited.has(current.id)) {
        throw new ConflictException('This sponsor change would create a referral cycle');
      }
      visited.add(current.id);
      if (!current.sponsorId) break;
      current = this.getById(current.sponsorId);
    }
  }

  getTree(rootId?: string): MemberTreeNode[] {
    const members = rootId ? [this.getById(rootId)] : this.members;
    const buildNode = (member: Member): MemberTreeNode => ({
      ...member,
      children: this.members
        .filter((candidate) => candidate.sponsorId === member.id)
        .map(buildNode),
    });

    if (rootId) {
      return [buildNode(members[0])];
    }

    return this.members
      .filter((member) => member.sponsorId === null)
      .map(buildNode);
  }

  getUpline(memberId: string): Member[] {
    const upline: Member[] = [];
    let current = this.getById(memberId);

    while (current.sponsorId !== null) {
      current = this.getById(current.sponsorId);
      upline.push(current);
    }

    return upline;
  }
}

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
      this.getById(sponsorId);
    }

    const nextId = Math.max(...this.members.map((member) => Number(member.id.slice(4)))) + 1;
    const member: Member = {
      id: `mem-${String(nextId).padStart(3, '0')}`,
      name,
      email,
      joinedAt: new Date().toISOString().slice(0, 10),
      sponsorId: sponsorId ?? null,
      status: 'active',
    };
    this.members.push(member);
    return member;
  }

  updateStatus(id: string, status: Member['status']): Member {
    const member = this.getById(id);
    member.status = status;
    return member;
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

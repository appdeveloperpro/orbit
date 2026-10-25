import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { CommissionService, JOINING_AMOUNT } from '../commissions/commission.service';
import { MembersService } from './members.service';

class CreateMemberDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  sponsorId?: string;
}

class UpdateMemberStatusDto {
  @IsIn(['active', 'inactive'])
  status!: 'active' | 'inactive';
}

@Controller('members')
@UseGuards(DemoAuthGuard)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly commissionService: CommissionService,
  ) {}

  @Get()
  list() {
    return this.membersService.list();
  }

  @Get('tree')
  tree() {
    return this.membersService.getTree();
  }

  @Post()
  create(@Body() body: CreateMemberDto) {
    const member = this.membersService.create(body.name, body.email, body.sponsorId);
    this.commissionService.simulate(member.id, JOINING_AMOUNT, `join-${member.id}`, 'joining');
    return member;
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateMemberStatusDto) {
    return this.membersService.updateStatus(id, body.status);
  }

  @Get(':id/tree')
  memberTree(@Param('id') id: string) {
    return this.membersService.getTree(id)[0];
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.membersService.getById(id);
  }
}

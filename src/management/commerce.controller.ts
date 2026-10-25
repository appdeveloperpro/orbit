import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { CommissionService } from '../commissions/commission.service';
import { RankService } from './rank.service';

class UpdatePayoutStatusDto {
  @IsIn(['pending', 'on-hold', 'paid'])
  status!: 'pending' | 'on-hold' | 'paid';
}

@Controller()
@UseGuards(DemoAuthGuard)
export class CommerceController {
  constructor(
    private readonly commissionService: CommissionService,
    private readonly rankService: RankService,
  ) {}

  @Get('orders')
  getOrders() {
    return this.commissionService.getOrders();
  }

  @Get('payouts')
  getPayouts() {
    this.rankService.getAwards();
    return this.commissionService.getPayouts();
  }

  @Patch('payouts/:id/status')
  updatePayout(@Param('id') id: string, @Body() body: UpdatePayoutStatusDto) {
    return this.commissionService.updatePayoutStatus(id, body.status);
  }
}

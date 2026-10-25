import { BadRequestException, Body, Controller, Get, Put, Post, UseGuards } from '@nestjs/common';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { CommissionService } from './commission.service';
import { SimulateCommissionDto } from './dto/simulate-commission.dto';
import { UpdateRatesDto } from './dto/update-rates.dto';

@Controller('commissions')
@UseGuards(DemoAuthGuard)
export class CommissionsController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('rates')
  getRates() {
    return this.commissionService.getRates();
  }

  @Put('rates')
  updateRates(@Body() body: UpdateRatesDto) {
    if (body.rates.reduce((total, rate) => total + rate.rateBps, 0) > 8000) {
      throw new BadRequestException('Unilevel rates cannot exceed 80% of turnover after the fixed 20% team pool');
    }
    return this.commissionService.updateRates(body.rates.map((rate) => rate.rateBps));
  }

  @Post('simulate')
  simulate(@Body() body: SimulateCommissionDto) {
    return this.commissionService.simulate(body.sourceMemberId, body.amount, body.referenceId);
  }

  @Get('ledger')
  getLedger() {
    return this.commissionService.getLedger();
  }
}

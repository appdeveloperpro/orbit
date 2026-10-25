import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { RankService } from './rank.service';
import { UpdateRankRulesDto, UpdateRewardAwardDto } from './rank.dto';

@Controller('ranks')
@UseGuards(DemoAuthGuard)
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Get('rules')
  getRules() {
    return this.rankService.getRules();
  }

  @Put('rules')
  updateRules(@Body() body: UpdateRankRulesDto) {
    return this.rankService.updateRules(body.rules);
  }

  @Get('progress')
  getProgress() {
    return this.rankService.getProgress();
  }

  @Get('rewards')
  getAwards() {
    return this.rankService.getAwards();
  }

  @Patch('rewards/:id/status')
  updateAward(@Param('id') id: string, @Body() body: UpdateRewardAwardDto) {
    return this.rankService.updateAwardStatus(id, body.status);
  }
}

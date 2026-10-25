import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

class RankRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  rewardTitle!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10)
  @Max(1000000)
  rewardAmount!: number;
}

export class UpdateRewardAwardDto {
  @IsIn(['pending', 'approved', 'fulfilled'])
  status!: 'pending' | 'approved' | 'fulfilled';
}

export class UpdateRankRulesDto {
  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RankRuleDto)
  rules!: RankRuleDto[];
}

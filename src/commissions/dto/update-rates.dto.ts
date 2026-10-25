import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';

class RateDto {
  @IsInt()
  @Min(0)
  @Max(10000)
  rateBps!: number;
}

export class UpdateRatesDto {
  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RateDto)
  rates!: RateDto[];
}

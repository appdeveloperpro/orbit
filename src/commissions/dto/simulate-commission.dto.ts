import { IsNumber, IsString, Max, MaxLength, Min, Matches } from 'class-validator';

export class SimulateCommissionDto {
  @IsString()
  @Matches(/^mem-\d{3,}$/)
  sourceMemberId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  amount!: number;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,64}$/)
  @MaxLength(64)
  referenceId!: string;
}

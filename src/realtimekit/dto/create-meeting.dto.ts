import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  persistChat?: boolean;

  @IsOptional()
  @IsBoolean()
  recordOnStart?: boolean;
}

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export enum RealtimeKitRole {
  GUEST = 'guest',
  HOST = 'host',
}

export class CreateParticipantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(RealtimeKitRole)
  role: RealtimeKitRole;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customParticipantId?: string;

  @IsOptional()
  @IsUrl()
  picture?: string;
}

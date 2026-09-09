import { IntersectionType } from '@nestjs/mapped-types';
import { CreateMeetingDto } from './create-meeting.dto';
import { CreateParticipantDto } from './create-participant.dto';

export class CreateDemoMeetingDto extends IntersectionType(
  CreateMeetingDto,
  CreateParticipantDto,
) {}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateDemoMeetingDto } from './dto/create-demo-meeting.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import {
  CreateParticipantDto,
  RealtimeKitRole,
} from './dto/create-participant.dto';
import { RealtimeKitService } from './realtimekit.service';

@Controller('realtimekit')
export class RealtimeKitController {
  constructor(private readonly realtimeKitService: RealtimeKitService) {}

  @Post('meetings')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  createMeeting(@Body() dto: CreateMeetingDto) {
    return this.realtimeKitService.createMeeting(dto);
  }

  @Post('meetings/:meetingId/participants')
  @UseGuards(SessionAuthGuard)
  addParticipant(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateParticipantDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const role =
      request.user.role === 'CUSTOMER'
        ? RealtimeKitRole.GUEST
        : RealtimeKitRole.HOST;
    return this.realtimeKitService.addParticipant(meetingId, {
      ...dto,
      role,
      customParticipantId: `user-${request.user.id}-${crypto.randomUUID()}`,
    });
  }

  @Post('quick-start')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  createDemo(
    @Body() dto: CreateDemoMeetingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.realtimeKitService.createDemo(
      {
        ...dto,
        role: RealtimeKitRole.HOST,
        customParticipantId: `user-${request.user.id}-${crypto.randomUUID()}`,
      },
      request.protocol + '://' + request.get('host'),
    );
  }

  @Get('demo')
  redirectLegacyDemo(
    @Query('authToken') authToken: string | undefined,
    @Res() response: Response,
  ): void {
    const query = new URLSearchParams();
    if (authToken) query.set('authToken', authToken);
    const suffix = query.size ? `?${query.toString()}` : '';
    response.redirect(302, `/meeting${suffix}`);
  }
}

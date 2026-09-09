import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  @Header('Content-Type', 'text/html; charset=utf-8')
  renderDemo(@Query('authToken') authToken?: string): string {
    const token = JSON.stringify(authToken ?? '').replaceAll('<', '\\u003c');
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RealtimeKit Demo</title>
  <style>html,body,rtk-meeting{width:100%;height:100%;margin:0;display:block}#error{padding:24px;font:16px sans-serif;color:#b91c1c}</style>
  <script type="module">
    import { defineCustomElements } from "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit-ui@latest/loader/index.es2017.js";
    defineCustomElements();
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit@latest/dist/browser.js"></script>
</head>
<body>
  <rtk-meeting id="meeting" show-setup-screen="true"></rtk-meeting>
  <div id="error"></div>
  <script>
    const authToken = ${token};
    if (!authToken) {
      document.getElementById('error').textContent = 'Thiếu authToken.';
      document.getElementById('meeting').remove();
    } else {
      RealtimeKitClient.init({ authToken })
        .then(meeting => { document.getElementById('meeting').meeting = meeting; })
        .catch(error => { document.getElementById('error').textContent = error.message; });
    }
  </script>
</body>
</html>`;
  }
}

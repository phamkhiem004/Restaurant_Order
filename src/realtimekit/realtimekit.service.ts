import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateDemoMeetingDto } from './dto/create-demo-meeting.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import {
  CreateParticipantDto,
  RealtimeKitRole,
} from './dto/create-participant.dto';

interface CloudflareApiError {
  code?: number;
  message?: string;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  data?: T;
  result?: T;
  errors?: CloudflareApiError[];
}

export interface RealtimeKitMeeting {
  id: string;
  title?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  persist_chat?: boolean;
  record_on_start?: boolean;
}

export interface RealtimeKitParticipant {
  id: string;
  token: string;
  custom_participant_id: string;
  preset_name: string;
  name?: string;
  picture?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class RealtimeKitService {
  constructor(private readonly configService: ConfigService) {}

  async createMeeting(dto: CreateMeetingDto): Promise<RealtimeKitMeeting> {
    return this.request<RealtimeKitMeeting>('/meetings', {
      method: 'POST',
      body: JSON.stringify({
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.persistChat !== undefined
          ? { persist_chat: dto.persistChat }
          : {}),
        ...(dto.recordOnStart !== undefined
          ? { record_on_start: dto.recordOnStart }
          : {}),
      }),
    });
  }

  async addParticipant(
    meetingId: string,
    dto: CreateParticipantDto,
  ): Promise<RealtimeKitParticipant> {
    const presetName =
      dto.role === RealtimeKitRole.HOST
        ? this.configService.get<string>(
            'REALTIMEKIT_HOST_PRESET',
            'group_call_host',
          )
        : this.configService.get<string>(
            'REALTIMEKIT_GUEST_PRESET',
            'group_call_guest',
          );

    return this.request<RealtimeKitParticipant>(
      `/meetings/${encodeURIComponent(meetingId)}/participants`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: dto.name,
          custom_participant_id: dto.customParticipantId ?? crypto.randomUUID(),
          preset_name: presetName,
          ...(dto.picture ? { picture: dto.picture } : {}),
        }),
      },
    );
  }

  async createDemo(dto: CreateDemoMeetingDto, requestUrl: string) {
    const meeting = await this.createMeeting(dto);
    const participant = await this.addParticipant(meeting.id, dto);
    const joinUrl = new URL('/realtimekit/demo', requestUrl);
    joinUrl.searchParams.set('authToken', participant.token);

    return {
      meeting,
      participant,
      authToken: participant.token,
      joinUrl: joinUrl.toString(),
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const accountId = this.configService.getOrThrow<string>(
      'CLOUDFLARE_ACCOUNT_ID',
    );
    const appId = this.configService.getOrThrow<string>('REALTIMEKIT_APP_ID');
    const apiToken = this.configService.get<string>('REALTIMEKIT_API_TOKEN');
    if (!apiToken) {
      throw new ServiceUnavailableException(
        'REALTIMEKIT_API_TOKEN has not been configured.',
      );
    }

    const url =
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}` +
      `/realtime/kit/${encodeURIComponent(appId)}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    let payload: CloudflareApiResponse<T>;
    try {
      const parsed: unknown = await response.json();
      payload = parsed as CloudflareApiResponse<T>;
    } catch {
      throw new BadGatewayException(
        `RealtimeKit returned an invalid response (${response.status}).`,
      );
    }

    const data = payload.data ?? payload.result;
    if (!response.ok || !payload.success || !data) {
      const message =
        payload.errors
          ?.map((error) => error.message)
          .filter(Boolean)
          .join('; ') ||
        `RealtimeKit request failed with status ${response.status}.`;
      throw new BadGatewayException(message);
    }

    return data;
  }
}

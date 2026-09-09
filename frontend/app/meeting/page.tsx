'use client';

import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
  useRealtimeKitMeeting,
  useRealtimeKitSelector,
} from '@cloudflare/realtimekit-react';
import { useEffect, useState } from 'react';

function HostWaitingRoomControls() {
  const { meeting } = useRealtimeKitMeeting();
  const canAcceptRequests = useRealtimeKitSelector(
    (client) => client.self.permissions.acceptWaitingRequests,
  );
  const meetingId = useRealtimeKitSelector((client) => client.meta.meetingId);
  const waitingParticipants = useRealtimeKitSelector((client) =>
    client.participants.waitlisted.toArray(),
  );
  const [actionError, setActionError] = useState('');

  if (!canAcceptRequests) return null;

  async function acceptParticipant(participantId: string) {
    setActionError('');
    try {
      await meeting.participants.acceptWaitingRoomRequest(participantId);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : 'Không thể duyệt người này.',
      );
    }
  }

  async function rejectParticipant(participantId: string) {
    setActionError('');
    try {
      await meeting.participants.rejectWaitingRoomRequest(participantId);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : 'Không thể từ chối người này.',
      );
    }
  }

  return (
    <aside
      className={`waiting-room-card ${waitingParticipants.length ? 'has-requests' : ''}`}
    >
      <strong>Phòng chờ: {waitingParticipants.length}</strong>
      <span className="waiting-meeting-id" title={meetingId}>
        Meeting: {meetingId}
      </span>

      {waitingParticipants.map((participant) => (
        <div className="waiting-person" key={participant.id}>
          <span>{participant.name || 'Khách chưa đặt tên'}</span>
          <div>
            <button onClick={() => acceptParticipant(participant.id)}>
              Chấp nhận
            </button>
            <button
              className="reject"
              onClick={() => rejectParticipant(participant.id)}
            >
              Từ chối
            </button>
          </div>
        </div>
      ))}

      {actionError && <small>{actionError}</small>}
    </aside>
  );
}

export default function MeetingPage() {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = new URL(window.location.href).searchParams.get(
      'authToken',
    );

    if (!authToken) {
      setError('Liên kết phòng họp không có authToken hợp lệ.');
      return;
    }

    initMeeting({
      authToken,
      defaults: {
        audio: true,
        video: true,
      },
    }).catch((reason: unknown) => {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể khởi tạo phòng họp.',
      );
    });
  }, [initMeeting]);

  useEffect(() => {
    if (!meeting) return;

    const returnHome = () => window.location.replace('/');
    meeting.self.on('roomLeft', returnHome);

    return () => {
      meeting.self.off('roomLeft', returnHome);
    };
  }, [meeting]);

  if (error) {
    return (
      <main className="meeting-status meeting-error">
        <h1>Không thể mở phòng họp</h1>
        <p>{error}</p>
        <a href="/">Quay lại trang chính</a>
      </main>
    );
  }

  if (!meeting) {
    return <main className="meeting-status">Đang tải phòng họp…</main>;
  }

  return (
    <main className="meeting-shell">
      <RealtimeKitProvider value={meeting}>
        <HostWaitingRoomControls />
        <RtkMeeting
          meeting={meeting}
          mode="fill"
          showSetupScreen={true}
          leaveOnUnmount={true}
          onRtkStatesUpdate={(event) => {
            if (
              event.detail.meeting === 'ended' ||
              event.detail.roomLeftState
            ) {
              window.location.replace('/');
            }
          }}
        />
      </RealtimeKitProvider>
    </main>
  );
}

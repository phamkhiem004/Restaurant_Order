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
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    if (waitingParticipants.length > 0) setIsCollapsed(false);
  }, [waitingParticipants.length]);

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
      className={`waiting-room-card ${waitingParticipants.length ? 'has-requests' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
    >
      <button
        className="waiting-room-toggle"
        type="button"
        aria-expanded={!isCollapsed}
        aria-label={
          isCollapsed ? 'Mở danh sách học viên chờ' : 'Thu gọn danh sách học viên chờ'
        }
        title={isCollapsed ? `Học viên chờ: ${waitingParticipants.length}` : ''}
        onClick={() => setIsCollapsed((current) => !current)}
      >
        {isCollapsed ? (
          <span className="waiting-room-compact" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <circle cx="9" cy="8" r="3" />
              <path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19" />
              <path d="M16 5v6M13 8h6" />
            </svg>
            {waitingParticipants.length > 0 && (
              <span>{waitingParticipants.length}</span>
            )}
          </span>
        ) : (
          <>
            <strong>Học viên chờ: {waitingParticipants.length}</strong>
            <span className="waiting-room-close" aria-hidden="true">
              ×
            </span>
          </>
        )}
      </button>

      {!isCollapsed && (
        <div className="waiting-room-content">
          <span className="waiting-meeting-id" title={meetingId}>
            Lớp học: {meetingId}
          </span>

          {waitingParticipants.length === 0 && (
            <span className="waiting-empty">Chưa có học viên nào chờ vào lớp.</span>
          )}

          {waitingParticipants.map((participant) => (
            <div className="waiting-person" key={participant.id}>
              <span>{participant.name || 'Học viên chưa đặt tên'}</span>
              <div>
                <button onClick={() => acceptParticipant(participant.id)}>
                  Cho vào lớp
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
        </div>
      )}
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
      setError('Liên kết lớp học không hợp lệ.');
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
          : 'Không thể khởi tạo lớp học.',
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
        <h1>Không thể vào lớp học</h1>
        <p>{error}</p>
        <a href="/">Quay lại trang chính</a>
      </main>
    );
  }

  if (!meeting) {
    return <main className="meeting-status">Đang tải lớp học…</main>;
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

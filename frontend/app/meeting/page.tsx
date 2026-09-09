'use client';

import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { useEffect, useState } from 'react';

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
      <RtkMeeting meeting={meeting} mode="fill" showSetupScreen={true} />
    </main>
  );
}

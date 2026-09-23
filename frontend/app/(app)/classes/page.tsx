'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { realtimekitApi } from '../../../lib/api';
import { useSession } from '../../../lib/session';

interface QuickStartResponse {
  meeting: { id: string; title?: string };
  joinUrl: string;
}

export default function ClassesPage() {
  const { user, loading: checkingSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [createdMeeting, setCreatedMeeting] =
    useState<QuickStartResponse | null>(null);

  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  async function createMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await realtimekitApi.quickStart({
        title:
          String(form.get('title') ?? '').trim() ||
          'Lớp dạy nấu ăn online',
        name: user.name,
        role: 'host',
        persistChat: true,
      });
      setCreatedMeeting(result);
      setMeetingId(result.meeting.id);
      setMessage(
        'Đã mở lớp học. Bạn có thể vào lớp hoặc gửi mã lớp cho học viên.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể mở lớp học.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function joinMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !meetingId.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const participant = await realtimekitApi.addParticipant(
        meetingId.trim(),
        {
          name: user.name,
          role: user.role === 'CUSTOMER' ? 'guest' : 'host',
        },
      );
      window.location.assign(
        `/meeting?authToken=${encodeURIComponent(participant.token)}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể vào lớp học.',
      );
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">LỚP HỌC TRỰC TUYẾN</p>
          <h1>Dạy nấu ăn online</h1>
        </div>
      </div>

      <section className="classes-hero">
        <div className="classes-hero-copy">
          <p>
            Đầu bếp hướng dẫn công thức trực tiếp qua video call. Nhân viên
            và quản trị viên mở lớp với vai trò giáo viên; khách hàng tham
            gia lớp với vai trò học viên, có thể đặt câu hỏi trực tiếp.
          </p>
        </div>
        <div className="classes-hero-media">
          <Image
            src="/images/cooking-class.jpg"
            alt="Học nấu ăn qua video call"
            width={640}
            height={360}
            priority
          />
        </div>
      </section>

      {checkingSession ? null : !user ? (
        <p className="banner">Đăng nhập để mở hoặc tham gia lớp học nấu ăn.</p>
      ) : (
        <section className="panel manage-panel meeting-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LỚP HỌC</p>
              <h2>Mở lớp hoặc tham gia</h2>
            </div>
            <span className="live-pill">LIVE</span>
          </div>

          {isStaff && (
            <form className="inline-form" onSubmit={createMeeting}>
              <label>
                Tên lớp học
                <input
                  name="title"
                  placeholder="Lớp dạy Phở Bò cùng đầu bếp"
                  maxLength={200}
                />
              </label>
              <button className="button primary" disabled={busy}>
                Mở lớp học (vai trò giáo viên)
              </button>
            </form>
          )}

          <form className="inline-form join-form" onSubmit={joinMeeting}>
            <label>
              Mã lớp học
              <input
                value={meetingId}
                onChange={(event) => setMeetingId(event.target.value)}
                placeholder="Dán mã lớp học vào đây"
                required
              />
            </label>
            <button className="button secondary" disabled={busy}>
              {user.role === 'CUSTOMER'
                ? 'Tham gia lớp học (học viên)'
                : 'Tham gia lớp học (giáo viên)'}
            </button>
          </form>

          {createdMeeting && (
            <div className="meeting-result">
              <div>
                <span>Mã lớp học</span>
                <code>{createdMeeting.meeting.id}</code>
              </div>
              <div className="result-actions">
                <button
                  className="button ghost small"
                  onClick={() =>
                    navigator.clipboard.writeText(createdMeeting.meeting.id)
                  }
                >
                  Sao chép mã
                </button>
                <a className="button primary small" href={createdMeeting.joinUrl}>
                  Vào lớp (giáo viên)
                </a>
              </div>
            </div>
          )}
          {message && <p className="form-message">{message}</p>}
        </section>
      )}
    </main>
  );
}

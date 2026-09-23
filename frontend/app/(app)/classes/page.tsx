'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { classSchedulesApi, usersApi } from '../../../lib/api';
import { formatDateTime, formatPrice, toDatetimeLocalInput } from '../../../lib/format';
import {
  classEnrollmentStatusLabel,
  classEnrollmentStatusTone,
  classScheduleStatusLabel,
  classScheduleStatusTone,
} from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type { ClassEnrollment, ClassSchedule, User } from '../../../lib/types';
import { usePolling } from '../../../lib/use-polling';

export default function ClassesPage() {
  const { user, loading: checkingSession } = useSession();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<ClassEnrollment[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [rosters, setRosters] = useState<Record<number, ClassEnrollment[]>>({});
  const [expandedRosterId, setExpandedRosterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [scheduleList, enrollmentList] = await Promise.all([
        classSchedulesApi.list(),
        user ? classSchedulesApi.myEnrollments() : Promise.resolve([]),
      ]);
      setSchedules(scheduleList);
      setMyEnrollments(enrollmentList);
      if (!opts?.silent) setError('');
    } catch (err) {
      if (!opts?.silent) {
        setError(
          err instanceof Error ? err.message : 'Không thể tải lịch dạy nấu ăn.',
        );
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!checkingSession) load();
  }, [checkingSession, load]);
  usePolling(() => {
    if (!checkingSession) load({ silent: true });
  }, 15000);

  useEffect(() => {
    if (!isStaff) return;
    usersApi
      .list()
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [isStaff]);

  const customerNameById = useMemo(() => {
    const map = new Map<number, string>();
    customers.forEach((customer) => map.set(customer.id, customer.name));
    return map;
  }, [customers]);

  const myEnrollmentByScheduleId = useMemo(() => {
    const map = new Map<number, ClassEnrollment>();
    myEnrollments.forEach((enrollment) => {
      if (enrollment.status !== 'CANCELLED') {
        map.set(enrollment.classScheduleId, enrollment);
      }
    });
    return map;
  }, [myEnrollments]);

  async function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    const localTime = String(form.get('scheduledAt') ?? '');
    try {
      await classSchedulesApi.create({
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || undefined,
        scheduledAt: new Date(localTime).toISOString(),
        durationMinutes: Number(form.get('durationMinutes')) || undefined,
        price: form.get('price') ? Number(form.get('price')) : undefined,
        capacity: form.get('capacity') ? Number(form.get('capacity')) : undefined,
      });
      setMessage('Đã lập lịch buổi học mới.');
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lập lịch buổi học.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart(id: number) {
    setBusy(true);
    setError('');
    try {
      const result = await classSchedulesApi.start(id);
      window.location.assign(result.joinUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu lớp.');
      setBusy(false);
    }
  }

  async function handleCancelSchedule(id: number) {
    setBusy(true);
    setError('');
    try {
      await classSchedulesApi.cancel(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hủy buổi học.');
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete(id: number) {
    setBusy(true);
    setError('');
    try {
      await classSchedulesApi.complete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật buổi học.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRoster(id: number) {
    if (expandedRosterId === id) {
      setExpandedRosterId(null);
      return;
    }
    setExpandedRosterId(id);
    if (!rosters[id]) {
      try {
        const roster = await classSchedulesApi.enrollmentsFor(id);
        setRosters((current) => ({ ...current, [id]: roster }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không thể tải danh sách học viên.',
        );
      }
    }
  }

  async function payForEnrollment(enrollmentId: number) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await classSchedulesApi.createPaymentUrl(enrollmentId);
      window.open(result.url, '_blank', 'noopener,noreferrer');
      setMessage('Đã mở trang thanh toán VNPay ở tab mới.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo link thanh toán.');
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll(id: number) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const enrollment = await classSchedulesApi.enroll(id);
      await payForEnrollment(enrollment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng ký buổi học.');
      setBusy(false);
    }
  }

  async function handleJoin(id: number) {
    setBusy(true);
    setError('');
    try {
      const result = await classSchedulesApi.join(id);
      window.location.assign(`/meeting?authToken=${encodeURIComponent(result.token)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể vào lớp học.');
      setBusy(false);
    }
  }

  const defaultDateTime = toDatetimeLocalInput(new Date(Date.now() + 60 * 60000));

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">LỚP HỌC TRỰC TUYẾN</p>
          <h1>Dạy nấu ăn online</h1>
        </div>
        <button className="button ghost small" onClick={() => load()} disabled={loading}>
          Làm mới
        </button>
      </div>

      <section className="classes-hero">
        <div className="classes-hero-copy">
          <p>
            Đầu bếp hướng dẫn công thức trực tiếp qua video call. Quản trị
            viên lên lịch buổi học bên dưới; khách hàng đăng ký và thanh toán
            theo buổi để mở khóa phòng học khi lớp bắt đầu.
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
        <p className="banner">Đăng nhập để đăng ký và tham gia buổi học nấu ăn.</p>
      ) : null}

      {error && <p className="banner banner-danger">{error}</p>}
      {message && <p className="form-message form-message-success">{message}</p>}

      {isStaff && (
        <section className="panel manage-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LẬP LỊCH</p>
              <h2>Thêm buổi học mới</h2>
            </div>
          </div>
          <form className="field-grid" onSubmit={handleCreateSchedule}>
            <label className="field-span">
              Tên buổi học
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Lớp dạy Phở Bò cùng đầu bếp"
              />
            </label>
            <label>
              Thời gian bắt đầu
              <input
                type="datetime-local"
                name="scheduledAt"
                defaultValue={defaultDateTime}
                required
              />
            </label>
            <label>
              Thời lượng (phút)
              <input type="number" name="durationMinutes" min={15} defaultValue={60} />
            </label>
            <label>
              Giá / buổi (VNĐ)
              <input type="number" name="price" min={0} step={1000} defaultValue={30000} />
            </label>
            <label>
              Sức chứa (để trống nếu không giới hạn)
              <input type="number" name="capacity" min={1} />
            </label>
            <label className="field-span">
              Mô tả
              <textarea
                name="description"
                rows={2}
                placeholder="Công thức, nguyên liệu cần chuẩn bị…"
              />
            </label>
            <button className="button primary" disabled={busy}>
              Lập lịch
            </button>
          </form>
        </section>
      )}

      <div className="class-schedule-list">
        {loading ? (
          <p className="empty">Đang tải lịch dạy nấu ăn…</p>
        ) : schedules.length ? (
          schedules.map((schedule) => {
            const enrollment = myEnrollmentByScheduleId.get(schedule.id);
            const roster = rosters[schedule.id];
            return (
              <article className="class-card" key={schedule.id}>
                <div className="class-card-head">
                  <div>
                    <h3>{schedule.title}</h3>
                    <p className="hint">
                      {formatDateTime(schedule.scheduledAt)} · {schedule.durationMinutes} phút
                    </p>
                  </div>
                  <Badge tone={classScheduleStatusTone[schedule.status]}>
                    {classScheduleStatusLabel[schedule.status]}
                  </Badge>
                </div>

                {schedule.description && <p>{schedule.description}</p>}

                <div className="class-card-meta">
                  <span>{formatPrice(schedule.price)} / buổi</span>
                  {schedule.capacity && <span>Sức chứa: {schedule.capacity} học viên</span>}
                </div>

                {isStaff && (
                  <div className="row-actions">
                    {schedule.status === 'SCHEDULED' && (
                      <>
                        <button
                          className="button primary small"
                          disabled={busy}
                          onClick={() => handleStart(schedule.id)}
                        >
                          Bắt đầu lớp
                        </button>
                        <button
                          className="button ghost small danger"
                          disabled={busy}
                          onClick={() => handleCancelSchedule(schedule.id)}
                        >
                          Hủy lớp
                        </button>
                      </>
                    )}
                    {schedule.status === 'LIVE' && (
                      <>
                        <button
                          className="button primary small"
                          disabled={busy}
                          onClick={() => handleJoin(schedule.id)}
                        >
                          Vào lớp (giáo viên)
                        </button>
                        <button
                          className="button ghost small"
                          disabled={busy}
                          onClick={() => handleComplete(schedule.id)}
                        >
                          Đánh dấu hoàn tất
                        </button>
                      </>
                    )}
                    <button
                      className="button ghost small"
                      onClick={() => toggleRoster(schedule.id)}
                    >
                      {expandedRosterId === schedule.id
                        ? 'Ẩn danh sách học viên'
                        : 'Xem danh sách học viên'}
                    </button>
                  </div>
                )}

                {isStaff && expandedRosterId === schedule.id && (
                  <ul className="class-roster">
                    {roster?.length ? (
                      roster.map((item) => (
                        <li key={item.id}>
                          <span>
                            {customerNameById.get(item.userId) ?? `Người dùng #${item.userId}`}
                          </span>
                          <Badge tone={classEnrollmentStatusTone[item.status]}>
                            {classEnrollmentStatusLabel[item.status]}
                          </Badge>
                        </li>
                      ))
                    ) : (
                      <li className="empty">Chưa có học viên đăng ký.</li>
                    )}
                  </ul>
                )}

                {!isStaff && user && (
                  <div className="row-actions">
                    {schedule.status === 'CANCELLED' ? (
                      <p className="hint">Buổi học này đã bị hủy.</p>
                    ) : schedule.status === 'COMPLETED' ? (
                      <p className="hint">Buổi học đã kết thúc.</p>
                    ) : !enrollment ? (
                      <button
                        className="button primary small"
                        disabled={busy}
                        onClick={() => handleEnroll(schedule.id)}
                      >
                        Đăng ký &amp; thanh toán ({formatPrice(schedule.price)})
                      </button>
                    ) : enrollment.status === 'PENDING_PAYMENT' ? (
                      <button
                        className="button primary small"
                        disabled={busy}
                        onClick={() => payForEnrollment(enrollment.id)}
                      >
                        Thanh toán ({formatPrice(enrollment.amount)})
                      </button>
                    ) : schedule.status === 'LIVE' ? (
                      <button
                        className="button primary small"
                        disabled={busy}
                        onClick={() => handleJoin(schedule.id)}
                      >
                        Vào lớp
                      </button>
                    ) : (
                      <p className="hint">Đã thanh toán — chờ lớp bắt đầu đúng giờ.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <p className="empty">Chưa có buổi học nào được lên lịch.</p>
        )}
      </div>
    </main>
  );
}

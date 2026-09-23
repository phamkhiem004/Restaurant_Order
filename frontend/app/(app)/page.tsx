'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  authApi,
  diningTablesApi,
  menuItemsApi,
  realtimekitApi,
  reservationsApi,
} from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { roleLabel } from '../../lib/labels';
import { useSession } from '../../lib/session';
import type { MenuItem, Reservation, TableMapEntry } from '../../lib/types';

interface QuickStartResponse {
  meeting: { id: string; title?: string };
  joinUrl: string;
}

export default function Home() {
  const { user, loading: checkingSession, setUser } = useSession();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableMapEntry[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [meetingId, setMeetingId] = useState('');
  const [createdMeeting, setCreatedMeeting] =
    useState<QuickStartResponse | null>(null);

  const loadDashboardData = useCallback(async () => {
    const [menuResult, tableResult, reservationResult] = await Promise.all([
      menuItemsApi.list().catch(() => []),
      diningTablesApi.map().catch(() => []),
      reservationsApi.list().catch(() => []),
    ]);
    setMenu(menuResult);
    setTables(tableResult);
    setReservations(reservationResult);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      if (authMode === 'register') {
        await authApi.register({
          name: String(form.get('name') ?? '').trim(),
          phone: String(form.get('phone') ?? '').trim(),
          email,
          password,
        });
      }
      const result = await authApi.login({ email, password });
      setUser(result.user);
      setMessage('Đăng nhập thành công.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  }

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

  if (checkingSession) {
    return (
      <main className="center-screen">Đang kiểm tra phiên đăng nhập…</main>
    );
  }

  if (!user) {
    return (
      <main>
        <section className="auth-shell" id="top">
          <div className="hero-copy">
            <p className="eyebrow">NESTJS · D1 · REDIS · REALTIMEKIT</p>
            <h1>Một nơi để vận hành nhà hàng và gặp khách hàng.</h1>
            <p>
              Đăng nhập để đặt bàn, gọi món, theo dõi bếp, thanh toán và tham
              gia lớp dạy nấu ăn online. Học viên tham gia lớp với vai trò
              khách mời; nhân viên và quản trị viên mở lớp với vai trò giáo
              viên.
            </p>
            <div className="feature-row">
              <span>Đặt bàn</span>
              <span>Gọi món &amp; bếp</span>
              <span>Thanh toán VNPay</span>
              <span>Lớp dạy nấu ăn online</span>
            </div>
          </div>

          <div className="auth-card">
            <div className="tabs" role="tablist">
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('login');
                  setMessage('');
                }}
              >
                Đăng nhập
              </button>
              <button
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('register');
                  setMessage('');
                }}
              >
                Tạo tài khoản
              </button>
            </div>
            <form onSubmit={handleAuth} className="form-stack">
              {authMode === 'register' && (
                <>
                  <label>
                    Họ tên
                    <input
                      name="name"
                      required
                      maxLength={100}
                      placeholder="Nguyễn Văn A"
                    />
                  </label>
                  <label>
                    Số điện thoại
                    <input
                      name="phone"
                      required
                      maxLength={20}
                      placeholder="0901234567"
                    />
                  </label>
                </>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ban@example.com"
                />
              </label>
              <label>
                Mật khẩu
                <input name="password" type="password" minLength={6} required />
              </label>
              <button className="button primary" disabled={busy}>
                {busy
                  ? 'Đang xử lý…'
                  : authMode === 'login'
                    ? 'Đăng nhập'
                    : 'Đăng ký và đăng nhập'}
              </button>
              {message && <p className="form-message">{message}</p>}
            </form>
          </div>
        </section>

        <section className="menu-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DỮ LIỆU TỪ D1</p>
              <h2>Thực đơn hôm nay</h2>
            </div>
          </div>
          <div className="menu-grid">
            {menu.length ? (
              menu.slice(0, 6).map((item) => (
                <article className="menu-card" key={item.id}>
                  <div className="menu-icon">{item.name.charAt(0)}</div>
                  <span>{item.category || 'Món ăn'}</span>
                  <h3>{item.name}</h3>
                  <p>
                    {item.description || 'Món ngon được phục vụ trong ngày.'}
                  </p>
                  <strong>
                    {formatPrice(
                      item.is_flash_sale && item.sale_price
                        ? item.sale_price
                        : item.price,
                    )}
                  </strong>
                </article>
              ))
            ) : (
              <p className="empty">Chưa có dữ liệu món ăn.</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  const availableTables = tables.filter(
    (table) => table.displayStatus === 'AVAILABLE',
  ).length;
  const now = Date.now();
  const myUpcomingReservations = reservations.filter(
    (reservation) =>
      reservation.userId === user.id &&
      (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') &&
      new Date(reservation.reservationTime).getTime() >= now,
  ).length;
  const allUpcomingReservations = reservations.filter(
    (reservation) =>
      (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') &&
      new Date(reservation.reservationTime).getTime() >= now,
  ).length;
  const isStaff = user.role === 'STAFF' || user.role === 'ADMIN';

  return (
    <main>
      <section className="dashboard-hero" id="top">
        <div>
          <p className="eyebrow">BẢNG ĐIỀU KHIỂN</p>
          <h1>Xin chào, {user.name}.</h1>
          <p>
            Bạn đang đăng nhập với quyền <strong>{roleLabel[user.role]}</strong>.
          </p>
        </div>
        <div className="session-card">
          <span className="status-dot" />
          Phiên dùng Redis, với D1 dự phòng khi Redis gián đoạn
        </div>
      </section>

      <section className="stat-row">
        <Link href="/tables" className="stat-card">
          <span className="stat-value">
            {availableTables}/{tables.length || '—'}
          </span>
          <span className="stat-label">Bàn còn trống</span>
        </Link>
        <Link href="/bookings" className="stat-card">
          <span className="stat-value">
            {isStaff ? allUpcomingReservations : myUpcomingReservations}
          </span>
          <span className="stat-label">
            {isStaff ? 'Lượt đặt bàn sắp tới' : 'Đặt bàn sắp tới của bạn'}
          </span>
        </Link>
        <Link href="/menu" className="stat-card">
          <span className="stat-value">{menu.length}</span>
          <span className="stat-label">Món trong thực đơn</span>
        </Link>
        {isStaff && (
          <Link href="/orders" className="stat-card">
            <span className="stat-value">→</span>
            <span className="stat-label">Quản lý đơn hàng &amp; bếp</span>
          </Link>
        )}
      </section>

      <section className="quick-links">
        <Link href="/menu" className="quick-link-card">
          <h3>Thực đơn</h3>
          <p>Xem món ăn, giá và ưu đãi flash sale.</p>
        </Link>
        <Link href="/tables" className="quick-link-card">
          <h3>Bàn ăn</h3>
          <p>Xem sơ đồ bàn còn trống, đang phục vụ hoặc bảo trì.</p>
        </Link>
        <Link href="/bookings" className="quick-link-card">
          <h3>Đặt bàn</h3>
          <p>Tạo lượt đặt bàn mới hoặc theo dõi trạng thái.</p>
        </Link>
        {isStaff && (
          <Link href="/orders" className="quick-link-card">
            <h3>Đơn hàng &amp; bếp</h3>
            <p>Mở bàn, gọi món, cập nhật trạng thái chế biến.</p>
          </Link>
        )}
        {isStaff && (
          <Link href="/payments" className="quick-link-card">
            <h3>Thanh toán</h3>
            <p>Chốt hóa đơn và tạo link thanh toán VNPay.</p>
          </Link>
        )}
        {user.role === 'ADMIN' && (
          <Link href="/accounts" className="quick-link-card">
            <h3>Người dùng</h3>
            <p>Quản lý tài khoản khách hàng và nhân viên.</p>
          </Link>
        )}
      </section>

      <section className="dashboard-grid">
        <article className="panel meeting-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">LỚP HỌC TRỰC TUYẾN</p>
              <h2>Dạy nấu ăn online</h2>
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
        </article>

        <aside className="panel account-panel">
          <p className="eyebrow">TÀI KHOẢN</p>
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <dl>
            <div>
              <dt>User ID</dt>
              <dd>#{user.id}</dd>
            </div>
            <div>
              <dt>Quyền</dt>
              <dd>{roleLabel[user.role]}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DỮ LIỆU TỪ D1</p>
            <h2>Thực đơn hôm nay</h2>
          </div>
          <Link className="button ghost small" href="/menu">
            Xem toàn bộ thực đơn
          </Link>
        </div>
        <div className="menu-grid">
          {menu.length ? (
            menu.slice(0, 6).map((item) => (
              <article className="menu-card" key={item.id}>
                <div className="menu-icon">{item.name.charAt(0)}</div>
                <span>{item.category || 'Món ăn'}</span>
                <h3>{item.name}</h3>
                <p>{item.description || 'Món ngon được phục vụ trong ngày.'}</p>
                <strong>
                  {formatPrice(
                    item.is_flash_sale && item.sale_price
                      ? item.sale_price
                      : item.price,
                  )}
                </strong>
              </article>
            ))
          ) : (
            <p className="empty">Chưa có dữ liệu món ăn.</p>
          )}
        </div>
      </section>
    </main>
  );
}

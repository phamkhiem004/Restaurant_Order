'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Role = 'CUSTOMER' | 'STAFF' | 'ADMIN';

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  sale_price?: number | string | null;
  is_flash_sale?: boolean;
  category: string | null;
}

interface QuickStartResponse {
  meeting: { id: string; title?: string };
  joinUrl: string;
}

const roleLabels: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message;
    throw new Error(message || `Yêu cầu thất bại (${response.status})`);
  }
  return body as T;
}

function formatPrice(value: number | string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value));
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [meetingId, setMeetingId] = useState('');
  const [createdMeeting, setCreatedMeeting] =
    useState<QuickStartResponse | null>(null);

  const loadMenu = useCallback(async () => {
    try {
      setMenu(await api<MenuItem[]>('/menu-items'));
    } catch {
      setMenu([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api<{ user: User }>('/auth/me')
        .then((result) => setUser(result.user))
        .catch(() => setUser(null)),
      loadMenu(),
    ]).finally(() => setCheckingSession(false));
  }, [loadMenu]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      if (authMode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: String(form.get('name') ?? '').trim(),
            phone: String(form.get('phone') ?? '').trim(),
            email,
            password,
          }),
        });
      }
      const result = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(result.user);
      setMessage('Đăng nhập thành công.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Clear the local UI even if the server session already expired.
    } finally {
      setUser(null);
      setCreatedMeeting(null);
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
      const result = await api<QuickStartResponse>('/realtimekit/quick-start', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') ?? '').trim() || 'Cuộc họp nhà hàng',
          name: user.name,
          role: 'host',
          persistChat: true,
        }),
      });
      setCreatedMeeting(result);
      setMeetingId(result.meeting.id);
      setMessage(
        'Đã tạo phòng họp. Bạn có thể mở phòng hoặc gửi mã cho khách.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể tạo phòng.',
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
      const participant = await api<{ token: string }>(
        `/realtimekit/meetings/${encodeURIComponent(meetingId.trim())}/participants`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: user.name,
            role: user.role === 'CUSTOMER' ? 'guest' : 'host',
          }),
        },
      );
      window.location.assign(
        `/realtimekit/demo?authToken=${encodeURIComponent(participant.token)}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể vào phòng.',
      );
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="center-screen">Đang kiểm tra phiên đăng nhập…</main>
    );
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Restaurant Hub">
          <span className="brand-mark">R</span>
          <span>Restaurant Hub</span>
        </a>
        {user && (
          <div className="user-actions">
            <span className={`role role-${user.role.toLowerCase()}`}>
              {roleLabels[user.role]}
            </span>
            <button
              className="button ghost small"
              onClick={logout}
              disabled={busy}
            >
              Đăng xuất
            </button>
          </div>
        )}
      </header>

      {!user ? (
        <section className="auth-shell" id="top">
          <div className="hero-copy">
            <p className="eyebrow">NESTJS · D1 · REDIS · REALTIMEKIT</p>
            <h1>Một nơi để vận hành nhà hàng và gặp khách hàng.</h1>
            <p>
              Đăng nhập để thử hệ thống phân quyền. Khách hàng tham gia phòng
              với quyền guest; nhân viên và quản trị viên có thể tạo phòng host.
            </p>
            <div className="feature-row">
              <span>Phiên Redis</span>
              <span>Phân quyền server</span>
              <span>Cloudflare Worker</span>
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
      ) : (
        <>
          <section className="dashboard-hero" id="top">
            <div>
              <p className="eyebrow">BẢNG ĐIỀU KHIỂN</p>
              <h1>Xin chào, {user.name}.</h1>
              <p>
                Bạn đang đăng nhập với quyền{' '}
                <strong>{roleLabels[user.role]}</strong>.
              </p>
            </div>
            <div className="session-card">
              <span className="status-dot" />
              Phiên dùng Redis, với D1 dự phòng khi Redis gián đoạn
            </div>
          </section>

          <section className="dashboard-grid">
            <article className="panel meeting-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">REALTIMEKIT</p>
                  <h2>Phòng tư vấn trực tuyến</h2>
                </div>
                <span className="live-pill">LIVE</span>
              </div>

              {(user.role === 'STAFF' || user.role === 'ADMIN') && (
                <form className="inline-form" onSubmit={createMeeting}>
                  <label>
                    Tên cuộc họp
                    <input
                      name="title"
                      placeholder="Tư vấn đặt bàn"
                      maxLength={200}
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Tạo phòng với quyền host
                  </button>
                </form>
              )}

              <form className="inline-form join-form" onSubmit={joinMeeting}>
                <label>
                  Mã cuộc họp
                  <input
                    value={meetingId}
                    onChange={(event) => setMeetingId(event.target.value)}
                    placeholder="Dán meeting ID vào đây"
                    required
                  />
                </label>
                <button className="button secondary" disabled={busy}>
                  {user.role === 'CUSTOMER'
                    ? 'Tham gia với quyền guest'
                    : 'Tham gia với quyền host'}
                </button>
              </form>

              {createdMeeting && (
                <div className="meeting-result">
                  <div>
                    <span>Mã cuộc họp</span>
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
                    <a
                      className="button primary small"
                      href={createdMeeting.joinUrl}
                    >
                      Mở phòng host
                    </a>
                  </div>
                </div>
              )}
              {message && <p className="form-message">{message}</p>}
              <p className="hint">
                Quyền host được kiểm tra tại backend; thay đổi dữ liệu trong
                trình duyệt không thể nâng quyền tài khoản CUSTOMER. Khóa API
                của server chỉ cấu hình một lần; token tham gia được backend tự
                tạo cho từng người và tự gắn vào liên kết mở phòng.
              </p>
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
                  <dd>{roleLabels[user.role]}</dd>
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
              <button className="button ghost small" onClick={loadMenu}>
                Làm mới
              </button>
            </div>
            <div className="menu-grid">
              {menu.length ? (
                menu.map((item) => (
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
        </>
      )}
    </main>
  );
}

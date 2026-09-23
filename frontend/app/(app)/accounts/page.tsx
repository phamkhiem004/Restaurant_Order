'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { usersApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { roleLabel } from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type { User } from '../../../lib/types';

interface EditState {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export default function UsersPage() {
  const { user, loading: checkingSession } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await usersApi.create({
        name: String(form.get('name') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      });
      setMessage('Đã tạo tài khoản mới (vai trò mặc định: Khách hàng).');
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo người dùng.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(target: User) {
    setEditingId(target.id);
    setEditState({
      name: target.name,
      phone: target.phone ?? '',
      email: target.email,
      password: '',
    });
    setMessage('');
    setError('');
  }

  async function saveEdit(id: number) {
    if (!editState) return;
    if (editState.password && editState.password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await usersApi.update(id, {
        name: editState.name.trim(),
        phone: editState.phone.trim(),
        email: editState.email.trim(),
        ...(editState.password ? { password: editState.password } : {}),
      });
      setMessage('Đã cập nhật người dùng.');
      setEditingId(null);
      setEditState(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật người dùng.');
    } finally {
      setBusy(false);
    }
  }

  if (!checkingSession && !isAdmin) {
    return (
      <main className="page">
        <div className="access-denied">
          <h1>Không có quyền truy cập</h1>
          <p>Trang quản lý người dùng chỉ dành cho quản trị viên.</p>
          <Link className="button primary" href="/">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Người dùng hệ thống</h1>
        </div>
        <button className="button ghost small" onClick={load} disabled={loading}>
          Làm mới
        </button>
      </div>

      <section className="panel manage-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TẠO TÀI KHOẢN</p>
            <h2>Thêm người dùng mới</h2>
          </div>
        </div>
        <form className="field-grid" onSubmit={handleCreate}>
          <label>
            Họ tên
            <input name="name" required maxLength={100} />
          </label>
          <label>
            Số điện thoại
            <input name="phone" required maxLength={20} />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" minLength={6} required />
          </label>
          <button className="button primary" disabled={busy}>
            Tạo tài khoản
          </button>
        </form>
        <p className="hint">
          Tài khoản mới luôn được tạo với vai trò Khách hàng — hệ thống hiện
          chưa hỗ trợ đặt vai trò Nhân viên/Quản trị viên qua API.
        </p>
        {message && <p className="form-message form-message-success">{message}</p>}
        {error && <p className="banner banner-danger">{error}</p>}
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Tạo lúc</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty">
                  Đang tải…
                </td>
              </tr>
            ) : users.length ? (
              users.map((target) => (
                <tr key={target.id}>
                  <td>#{target.id}</td>
                  <td>{target.name}</td>
                  <td>{target.email}</td>
                  <td>{target.phone ?? '—'}</td>
                  <td>
                    <span className={`role role-${target.role.toLowerCase()}`}>
                      {roleLabel[target.role]}
                    </span>
                  </td>
                  <td>{target.createdAt ? formatDateTime(target.createdAt) : '—'}</td>
                  <td>
                    <button className="button ghost small" onClick={() => startEdit(target)}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  Chưa có người dùng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId !== null && editState && (
        <section className="panel edit-drawer">
          <div className="panel-heading">
            <h3>Chỉnh sửa người dùng #{editingId}</h3>
            <button
              className="button ghost small"
              onClick={() => {
                setEditingId(null);
                setEditState(null);
              }}
            >
              Đóng
            </button>
          </div>
          <div className="field-grid">
            <label>
              Họ tên
              <input
                value={editState.name}
                onChange={(event) => setEditState({ ...editState, name: event.target.value })}
              />
            </label>
            <label>
              Số điện thoại
              <input
                value={editState.phone}
                onChange={(event) => setEditState({ ...editState, phone: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={editState.email}
                onChange={(event) => setEditState({ ...editState, email: event.target.value })}
              />
            </label>
            <label>
              Mật khẩu mới (để trống nếu không đổi)
              <input
                type="password"
                minLength={6}
                value={editState.password}
                onChange={(event) =>
                  setEditState({ ...editState, password: event.target.value })
                }
              />
            </label>
            <button className="button primary" disabled={busy} onClick={() => saveEdit(editingId)}>
              Lưu thay đổi
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

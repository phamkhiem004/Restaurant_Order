'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { diningTablesApi, reservationsApi, usersApi } from '../../../lib/api';
import {
  formatDateTime,
  formatShortDate,
  formatTime,
  toDatetimeLocalInput,
} from '../../../lib/format';
import { reservationStatusLabel, reservationStatusTone } from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type {
  DiningTable,
  Reservation,
  ReservationStatus,
  User,
} from '../../../lib/types';
import { usePolling } from '../../../lib/use-polling';

const STATUS_TABS: ('all' | ReservationStatus)[] = [
  'all',
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

export default function ReservationsPage() {
  const { user, loading: checkingSession } = useSession();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availableTables, setAvailableTables] = useState<DiningTable[]>([]);
  const [allTables, setAllTables] = useState<DiningTable[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');

  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [reservationList, availableList, tableList] = await Promise.all([
        reservationsApi.list(),
        diningTablesApi.available(),
        diningTablesApi.list(),
      ]);
      setReservations(reservationList);
      setAvailableTables(availableList);
      setAllTables(tableList);
      if (!opts?.silent) setError('');
    } catch (err) {
      if (!opts?.silent) {
        setError(
          err instanceof Error ? err.message : 'Không thể tải danh sách đặt bàn.',
        );
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePolling(() => load({ silent: true }), 15000);

  useEffect(() => {
    if (!isStaff) return;
    usersApi
      .list()
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [isStaff]);

  const tableNameById = useMemo(() => {
    const map = new Map<number, string>();
    allTables.forEach((table) => map.set(table.id, table.tableNumber));
    return map;
  }, [allTables]);

  const customerNameById = useMemo(() => {
    const map = new Map<number, string>();
    customers.forEach((customer) => map.set(customer.id, customer.name));
    return map;
  }, [customers]);

  const visibleReservations = useMemo(() => {
    const scoped = isStaff
      ? reservations
      : reservations.filter((reservation) => reservation.userId === user?.id);
    const filtered =
      statusFilter === 'all'
        ? scoped
        : scoped.filter((reservation) => reservation.status === statusFilter);
    return [...filtered].sort(
      (a, b) =>
        new Date(b.reservationTime).getTime() -
        new Date(a.reservationTime).getTime(),
    );
  }, [reservations, statusFilter, isStaff, user?.id]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    const localTime = String(form.get('reservationTime') ?? '');
    try {
      await reservationsApi.create({
        userId: isStaff ? Number(form.get('userId')) : user.id,
        tableId: Number(form.get('tableId')),
        reservationTime: new Date(localTime).toISOString(),
        guestCount: Number(form.get('guestCount')),
        notes: String(form.get('notes') ?? '').trim() || undefined,
      });
      setMessage('Đã tạo lượt đặt bàn.');
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đặt bàn.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: number, status: ReservationStatus) {
    setBusy(true);
    setError('');
    try {
      await reservationsApi.updateStatus(id, status);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.',
      );
    } finally {
      setBusy(false);
    }
  }

  const defaultDateTime = toDatetimeLocalInput(new Date(Date.now() + 60 * 60000));

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">ĐẶT BÀN</p>
          <h1>{isStaff ? 'Quản lý đặt bàn' : 'Đặt bàn của bạn'}</h1>
        </div>
        <button className="button ghost small" onClick={() => load()} disabled={loading}>
          Làm mới
        </button>
      </div>

      {!checkingSession && user && (
        <section className="panel manage-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ĐẶT BÀN MỚI</p>
              <h2>Chọn bàn và thời gian</h2>
            </div>
          </div>
          <form className="field-grid" onSubmit={handleCreate}>
            {isStaff && (
              <label>
                Khách hàng
                <select name="userId" required defaultValue="">
                  <option value="" disabled>
                    Chọn khách hàng
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Bàn
              <select name="tableId" required defaultValue="">
                <option value="" disabled>
                  Chọn bàn còn trống
                </option>
                {availableTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    Bàn {table.tableNumber} · {table.capacity} khách
                  </option>
                ))}
              </select>
            </label>
            <label>
              Thời gian
              <input
                type="datetime-local"
                name="reservationTime"
                defaultValue={defaultDateTime}
                required
              />
            </label>
            <label>
              Số khách
              <input name="guestCount" type="number" min={1} required />
            </label>
            <label className="field-span">
              Ghi chú
              <textarea name="notes" rows={2} placeholder="Yêu cầu đặc biệt…" />
            </label>
            <button className="button primary" disabled={busy}>
              Tạo đặt bàn
            </button>
          </form>
          {message && <p className="form-message form-message-success">{message}</p>}
        </section>
      )}

      {!checkingSession && !user && (
        <p className="banner">Đăng nhập để tạo lượt đặt bàn mới.</p>
      )}

      {error && <p className="banner banner-danger">{error}</p>}

      <div className="tabs-row">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={statusFilter === tab ? 'active' : ''}
            onClick={() => setStatusFilter(tab)}
          >
            {tab === 'all' ? 'Tất cả' : reservationStatusLabel[tab]}
          </button>
        ))}
      </div>

      <div className="booking-list">
        {loading ? (
          <p className="empty">Đang tải…</p>
        ) : visibleReservations.length ? (
          visibleReservations.map((reservation) => {
            const isOwner = reservation.userId === user?.id;
            const canCancel =
              (isStaff || isOwner) &&
              (reservation.status === 'PENDING' ||
                reservation.status === 'CONFIRMED');
            return (
              <article className="booking-card" key={reservation.id}>
                <div className="booking-card-time">
                  <span className="booking-card-day">
                    {formatShortDate(reservation.reservationTime)}
                  </span>
                  <span className="booking-card-hour">
                    {formatTime(reservation.reservationTime)}
                  </span>
                </div>
                <div className="booking-card-main">
                  <div className="booking-card-heading">
                    <h3>
                      Bàn{' '}
                      {reservation.tableId
                        ? (tableNameById.get(reservation.tableId) ?? reservation.tableId)
                        : '—'}{' '}
                      · {reservation.guestCount} khách
                    </h3>
                    <Badge tone={reservationStatusTone[reservation.status ?? 'PENDING']}>
                      {reservationStatusLabel[reservation.status ?? 'PENDING']}
                    </Badge>
                  </div>
                  {isStaff && (
                    <p className="hint">
                      Khách:{' '}
                      {customerNameById.get(reservation.userId) ??
                        `Người dùng #${reservation.userId}`}
                    </p>
                  )}
                  <p className="hint">
                    Kết thúc dự kiến: {formatDateTime(reservation.endTime)}
                  </p>
                  {reservation.notes && (
                    <p className="hint">Ghi chú: {reservation.notes}</p>
                  )}
                </div>
                <div className="booking-card-actions">
                  {isStaff && reservation.status === 'PENDING' && (
                    <button
                      className="button ghost small"
                      disabled={busy}
                      onClick={() => updateStatus(reservation.id, 'CONFIRMED')}
                    >
                      Xác nhận
                    </button>
                  )}
                  {isStaff && reservation.status === 'CONFIRMED' && (
                    <button
                      className="button ghost small"
                      disabled={busy}
                      onClick={() => updateStatus(reservation.id, 'COMPLETED')}
                    >
                      Hoàn tất
                    </button>
                  )}
                  {canCancel && (
                    <button
                      className="button ghost small danger"
                      disabled={busy}
                      onClick={() => updateStatus(reservation.id, 'CANCELLED')}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty">Chưa có lượt đặt bàn nào.</p>
        )}
      </div>
    </main>
  );
}

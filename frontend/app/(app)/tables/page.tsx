'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { diningTablesApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { tableStatusLabel, tableStatusTone } from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type { TableMapEntry } from '../../../lib/types';

export default function TablesPage() {
  const { user } = useSession();
  const [tables, setTables] = useState<TableMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const canManage = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      setTables(await diningTablesApi.map());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải sơ đồ bàn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await diningTablesApi.create({
        tableNumber: String(form.get('tableNumber') ?? '').trim(),
        capacity: Number(form.get('capacity')),
      });
      setMessage('Đã thêm bàn ăn mới.');
      (event.target as HTMLFormElement).reset();
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm bàn ăn.');
    } finally {
      setBusy(false);
    }
  }

  const summary = tables.reduce(
    (acc, table) => {
      acc[table.displayStatus] = (acc[table.displayStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">SƠ ĐỒ BÀN ĂN</p>
          <h1>Tình trạng bàn theo thời gian thực</h1>
        </div>
        <button className="button ghost small" onClick={loadTables} disabled={loading}>
          Làm mới
        </button>
      </div>

      <div className="stat-row">
        {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'] as const).map(
          (status) => (
            <div className="stat-card" key={status}>
              <span className="stat-value">{summary[status] ?? 0}</span>
              <span className="stat-label">{tableStatusLabel[status]}</span>
            </div>
          ),
        )}
      </div>

      {error && <p className="banner banner-danger">{error}</p>}

      <div className="table-grid">
        {loading ? (
          <p className="empty">Đang tải sơ đồ bàn…</p>
        ) : tables.length ? (
          tables.map((table) => (
            <article className={`table-card table-card-${table.displayStatus.toLowerCase()}`} key={table.id}>
              <div className="table-card-head">
                <h3>Bàn {table.tableNumber}</h3>
                <Badge tone={tableStatusTone[table.displayStatus]}>
                  {tableStatusLabel[table.displayStatus]}
                </Badge>
              </div>
              <p>Sức chứa: {table.capacity} khách</p>
              {table.nextReservationTime && (
                <p className="hint">
                  Có khách đặt lúc {formatDateTime(table.nextReservationTime)}
                </p>
              )}
            </article>
          ))
        ) : (
          <p className="empty">Chưa có bàn ăn nào được tạo.</p>
        )}
      </div>

      {canManage && (
        <section className="panel manage-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">QUẢN LÝ BÀN ĂN</p>
              <h2>Thêm bàn mới</h2>
            </div>
          </div>
          <form className="field-grid" onSubmit={handleCreate}>
            <label>
              Số bàn
              <input name="tableNumber" required maxLength={20} placeholder="B01" />
            </label>
            <label>
              Sức chứa
              <input name="capacity" type="number" min={1} required />
            </label>
            <button className="button primary" disabled={busy}>
              Thêm bàn
            </button>
          </form>
          {message && <p className="form-message form-message-success">{message}</p>}
        </section>
      )}
    </main>
  );
}

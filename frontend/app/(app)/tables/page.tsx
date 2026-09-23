'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { diningTablesApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { tableStatusLabel } from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type { TableMapEntry } from '../../../lib/types';
import { usePolling } from '../../../lib/use-polling';

export default function TablesPage() {
  const { user } = useSession();
  const [tables, setTables] = useState<TableMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const canManage = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const loadTables = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const result = await diningTablesApi.map();
      setTables(result);
      if (!opts?.silent) setError('');
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof Error ? err.message : 'Không thể tải sơ đồ bàn.');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);
  usePolling(() => loadTables({ silent: true }), 15000);

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

  const legendStatuses: TableMapEntry['displayStatus'][] = [
    'AVAILABLE',
    'OCCUPIED',
    'RESERVED',
    'MAINTENANCE',
  ];

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">SƠ ĐỒ BÀN ĂN</p>
          <h1>Tình trạng bàn theo thời gian thực</h1>
        </div>
        <button className="button ghost small" onClick={() => loadTables()} disabled={loading}>
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

      <section className="panel floor-plan-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SƠ ĐỒ</p>
            <h2>Mặt bằng nhà hàng</h2>
          </div>
        </div>

        {loading ? (
          <p className="empty">Đang tải sơ đồ bàn…</p>
        ) : tables.length ? (
          <>
            <div className="floor-plan">
              <div className="floor-plan-zone-kitchen">Khu bếp</div>
              <div className="floor-plan-grid">
                {tables.map((table) => {
                  const isLong = table.capacity > 4;
                  const size = Math.min(
                    128,
                    72 + Math.max(0, table.capacity - 2) * 8,
                  );
                  return (
                    <div
                      className={`floor-table floor-table-${table.displayStatus.toLowerCase()} ${isLong ? 'floor-table-long' : 'floor-table-round'}`}
                      key={table.id}
                      style={{
                        width: isLong ? size * 1.5 : size,
                        height: size,
                      }}
                      tabIndex={0}
                    >
                      <span className="floor-table-number">{table.tableNumber}</span>
                      <span className="floor-table-capacity">{table.capacity} khách</span>
                      <div className="floor-table-tooltip">
                        <strong>Bàn {table.tableNumber}</strong>
                        <br />
                        {tableStatusLabel[table.displayStatus]} · {table.capacity} khách
                        {table.nextReservationTime && (
                          <>
                            <br />
                            Có khách đặt lúc {formatDateTime(table.nextReservationTime)}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="floor-plan-zone-entrance" />
            </div>
            <div className="floor-plan-legend">
              {legendStatuses.map((status) => (
                <span key={status}>
                  <i className={`floor-table-${status.toLowerCase()}`} />
                  {tableStatusLabel[status]}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="empty">Chưa có bàn ăn nào được tạo.</p>
        )}
      </section>

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

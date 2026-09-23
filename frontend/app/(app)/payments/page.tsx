'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { diningTablesApi, ordersApi, vnpayApi } from '../../../lib/api';
import { formatDateTime, formatPrice } from '../../../lib/format';
import { orderStatusLabel, orderStatusTone } from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type { DiningTable, Order } from '../../../lib/types';

export default function PaymentsPage() {
  const { user, loading: checkingSession } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<Record<number, string>>({});

  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderList, tableList] = await Promise.all([
        ordersApi.listOrders(),
        diningTablesApi.list(),
      ]);
      setOrders(orderList);
      setTables(tableList);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff, load]);

  const tableNameById = useMemo(() => {
    const map = new Map<number, string>();
    tables.forEach((table) => map.set(table.id, table.tableNumber));
    return map;
  }, [tables]);

  const servedOrders = orders.filter((order) => order.status === 'SERVED');
  const billedOrders = orders.filter((order) => order.status === 'BILLED');
  const paidOrders = [...orders]
    .filter((order) => order.status === 'PAID')
    .sort((a, b) => b.id - a.id)
    .slice(0, 20);

  async function createPaymentLink(orderId: number) {
    setBusy(orderId);
    setMessage('');
    setError('');
    try {
      const result = await vnpayApi.createPaymentUrl(orderId);
      setPaymentLinks((current) => ({ ...current, [orderId]: result.url }));
      window.open(result.url, '_blank', 'noopener,noreferrer');
      setMessage(`Đã tạo link thanh toán VNPay cho đơn #${orderId}.`);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tạo link thanh toán.',
      );
    } finally {
      setBusy(null);
    }
  }

  if (!checkingSession && !isStaff) {
    return (
      <main className="page">
        <div className="access-denied">
          <h1>Không có quyền truy cập</h1>
          <p>Trang thanh toán chỉ dành cho nhân viên và quản trị viên.</p>
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
          <p className="eyebrow">THANH TOÁN</p>
          <h1>Chốt hóa đơn &amp; thanh toán VNPay</h1>
        </div>
        <button className="button ghost small" onClick={load} disabled={loading}>
          Làm mới
        </button>
      </div>

      <p className="banner">
        Hệ thống hiện chỉ hỗ trợ thanh toán trực tuyến qua VNPay: khi bàn đã{' '}
        <strong>Đã phục vụ</strong>, tạo link thanh toán bên dưới rồi gửi cho
        khách. Sau khi VNPay xác nhận, đơn hàng tự chuyển sang{' '}
        <strong>Đã thanh toán</strong> và bàn được giải phóng.
      </p>

      {message && <p className="form-message form-message-success">{message}</p>}
      {error && <p className="banner banner-danger">{error}</p>}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CẦN THANH TOÁN</p>
            <h2>Bàn đã phục vụ xong</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Bàn</th>
                <th>Tổng tiền</th>
                <th>Thời gian mở bàn</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Đang tải…
                  </td>
                </tr>
              ) : servedOrders.length ? (
                servedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>Bàn {tableNameById.get(order.tableId) ?? order.tableId}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>
                      <button
                        className="button primary small"
                        disabled={busy === order.id}
                        onClick={() => createPaymentLink(order.id)}
                      >
                        Tạo link thanh toán VNPay
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty">
                    Không có bàn nào đang chờ chốt hóa đơn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ĐANG CHỜ VNPAY XÁC NHẬN</p>
            <h2>Đã chốt hóa đơn</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Bàn</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {billedOrders.length ? (
                billedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>Bàn {tableNameById.get(order.tableId) ?? order.tableId}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                    <td>
                      <Badge tone={orderStatusTone.BILLED}>
                        {orderStatusLabel.BILLED}
                      </Badge>
                    </td>
                    <td className="row-actions">
                      <button
                        className="button ghost small"
                        disabled={busy === order.id}
                        onClick={() => createPaymentLink(order.id)}
                      >
                        Mở lại link VNPay
                      </button>
                      {paymentLinks[order.id] && (
                        <button
                          className="button ghost small"
                          onClick={() =>
                            navigator.clipboard.writeText(paymentLinks[order.id])
                          }
                        >
                          Sao chép link
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty">
                    Không có hóa đơn nào đang chờ xác nhận thanh toán.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">LỊCH SỬ</p>
            <h2>Đơn đã thanh toán gần đây</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Bàn</th>
                <th>Tổng tiền</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {paidOrders.length ? (
                paidOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>Bàn {tableNameById.get(order.tableId) ?? order.tableId}</td>
                    <td>{formatPrice(order.totalAmount)}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty">
                    Chưa có đơn nào được thanh toán.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

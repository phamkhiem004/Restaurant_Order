'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import {
  diningTablesApi,
  menuItemsApi,
  ordersApi,
  reservationsApi,
} from '../../../lib/api';
import { formatDateTime, formatPrice } from '../../../lib/format';
import { orderItemStatusLabel, orderItemStatusTone, orderStatusLabel, orderStatusTone } from '../../../lib/labels';
import { useSession } from '../../../lib/session';
import type {
  DiningTable,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  Reservation,
} from '../../../lib/types';
import { usePolling } from '../../../lib/use-polling';

interface CartLine {
  menuItemId: number;
  quantity: number;
}

const STATUS_TABS: ('all' | OrderStatus)[] = [
  'all',
  'NEW',
  'PREPARING',
  'SERVED',
  'BILLED',
  'PAID',
];

function effectivePrice(item: MenuItem) {
  return item.is_flash_sale && item.sale_price ? item.sale_price : item.price;
}

export default function OrdersPage() {
  const { user, loading: checkingSession } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [availableTables, setAvailableTables] = useState<DiningTable[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const [newTableId, setNewTableId] = useState('');
  const [newReservationId, setNewReservationId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickMenuItem, setPickMenuItem] = useState('');
  const [pickQuantity, setPickQuantity] = useState('1');

  const [addItemsOrderId, setAddItemsOrderId] = useState<number | null>(null);
  const [addCart, setAddCart] = useState<CartLine[]>([]);
  const [quantityEdits, setQuantityEdits] = useState<Record<number, string>>({});

  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [orderList, itemList, tableList, availableList, menuList, reservationList] =
        await Promise.all([
          ordersApi.listOrders(),
          ordersApi.listOrderItems(),
          diningTablesApi.list(),
          diningTablesApi.available(),
          menuItemsApi.list(),
          reservationsApi.list(),
        ]);
      setOrders(orderList);
      setOrderItems(itemList);
      setTables(tableList);
      setAvailableTables(availableList);
      setMenu(menuList);
      setReservations(reservationList);
      if (!opts?.silent) setError('');
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng.');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff, load]);
  usePolling(() => {
    if (isStaff) load({ silent: true });
  }, 15000);

  const tableNameById = useMemo(() => {
    const map = new Map<number, string>();
    tables.forEach((table) => map.set(table.id, table.tableNumber));
    return map;
  }, [tables]);

  const menuById = useMemo(() => {
    const map = new Map<number, MenuItem>();
    menu.forEach((item) => map.set(item.id, item));
    return map;
  }, [menu]);

  const itemsByOrderId = useMemo(() => {
    const map = new Map<number, OrderItem[]>();
    orderItems.forEach((item) => {
      const list = map.get(item.orderId) ?? [];
      list.push(item);
      map.set(item.orderId, list);
    });
    return map;
  }, [orderItems]);

  const visibleOrders = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? orders
        : orders.filter((order) => order.status === statusFilter);
    return [...filtered].sort((a, b) => b.id - a.id);
  }, [orders, statusFilter]);

  const reservationsForNewTable = useMemo(() => {
    if (!newTableId) return [];
    return reservations.filter(
      (reservation) =>
        reservation.tableId === Number(newTableId) &&
        (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'),
    );
  }, [reservations, newTableId]);

  const activeMenu = useMemo(() => menu.filter((item) => item.isActive !== false), [menu]);

  function addToCart() {
    if (!pickMenuItem) return;
    const menuItemId = Number(pickMenuItem);
    const quantity = Math.max(1, Number(pickQuantity) || 1);
    setCart((current) => {
      const existing = current.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return current.map((line) =>
          line.menuItemId === menuItemId
            ? { ...line, quantity: line.quantity + quantity }
            : line,
        );
      }
      return [...current, { menuItemId, quantity }];
    });
    setPickQuantity('1');
  }

  function addToAddCart() {
    if (!pickMenuItem) return;
    const menuItemId = Number(pickMenuItem);
    const quantity = Math.max(1, Number(pickQuantity) || 1);
    setAddCart((current) => {
      const existing = current.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return current.map((line) =>
          line.menuItemId === menuItemId
            ? { ...line, quantity: line.quantity + quantity }
            : line,
        );
      }
      return [...current, { menuItemId, quantity }];
    });
    setPickQuantity('1');
  }

  const cartTotal = cart.reduce((sum, line) => {
    const item = menuById.get(line.menuItemId);
    return sum + (item ? Number(effectivePrice(item)) * line.quantity : 0);
  }, 0);

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTableId || cart.length === 0) {
      setError('Vui lòng chọn bàn và ít nhất một món ăn.');
      return;
    }
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await ordersApi.create({
        tableId: Number(newTableId),
        note: String(form.get('note') ?? '').trim() || undefined,
        reservationId: newReservationId ? Number(newReservationId) : undefined,
        items: cart,
      });
      setMessage('Đã tạo đơn hàng mới.');
      setCart([]);
      setNewTableId('');
      setNewReservationId('');
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn hàng.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAddItems(orderId: number) {
    if (addCart.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await ordersApi.addItems(orderId, { items: addCart });
      setMessage(`Đã gọi thêm món cho đơn #${orderId}.`);
      setAddCart([]);
      setAddItemsOrderId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gọi thêm món.');
    } finally {
      setBusy(false);
    }
  }

  async function advanceItemStatus(itemId: number, status: 'COOKING' | 'DONE') {
    setBusy(true);
    setError('');
    try {
      await ordersApi.updateItemStatus(itemId, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật món ăn.');
    } finally {
      setBusy(false);
    }
  }

  async function saveQuantity(orderId: number, itemId: number) {
    const value = Number(quantityEdits[itemId]);
    if (!value || value < 1) return;
    setBusy(true);
    setError('');
    try {
      await ordersApi.updateItemQuantity(orderId, itemId, value);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật số lượng.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelItem(orderId: number, itemId: number) {
    setBusy(true);
    setError('');
    try {
      await ordersApi.cancelItem(orderId, itemId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hủy món ăn.');
    } finally {
      setBusy(false);
    }
  }

  if (!checkingSession && !isStaff) {
    return (
      <main className="page">
        <div className="access-denied">
          <h1>Không có quyền truy cập</h1>
          <p>Trang quản lý đơn hàng chỉ dành cho nhân viên và quản trị viên.</p>
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
          <p className="eyebrow">POS &amp; BẾP</p>
          <h1>Quản lý đơn hàng</h1>
        </div>
        <button className="button ghost small" onClick={() => load()} disabled={loading}>
          Làm mới
        </button>
      </div>

      <section className="panel manage-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">MỞ BÀN</p>
            <h2>Tạo đơn hàng mới</h2>
          </div>
        </div>
        <form className="field-grid" onSubmit={handleCreateOrder}>
          <label>
            Bàn
            <select
              value={newTableId}
              onChange={(event) => {
                setNewTableId(event.target.value);
                setNewReservationId('');
              }}
              required
            >
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
            Đơn đặt bàn liên kết (tùy chọn)
            <select
              value={newReservationId}
              onChange={(event) => setNewReservationId(event.target.value)}
            >
              <option value="">Không liên kết</option>
              {reservationsForNewTable.map((reservation) => (
                <option key={reservation.id} value={reservation.id}>
                  #{reservation.id} · {formatDateTime(reservation.reservationTime)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-span">
            Ghi chú
            <textarea name="note" rows={2} placeholder="Ghi chú cho bếp…" />
          </label>

          <div className="field-span item-picker">
            <label>
              Món ăn
              <select
                value={pickMenuItem}
                onChange={(event) => setPickMenuItem(event.target.value)}
              >
                <option value="">Chọn món</option>
                {activeMenu.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatPrice(effectivePrice(item))}
                  </option>
                ))}
              </select>
            </label>
            <label>
              SL
              <input
                type="number"
                min={1}
                value={pickQuantity}
                onChange={(event) => setPickQuantity(event.target.value)}
              />
            </label>
            <button type="button" className="button secondary small" onClick={addToCart}>
              Thêm vào đơn
            </button>
          </div>

          {cart.length > 0 && (
            <ul className="cart-list field-span">
              {cart.map((line) => {
                const item = menuById.get(line.menuItemId);
                return (
                  <li key={line.menuItemId}>
                    <span>
                      {item?.name ?? `Món #${line.menuItemId}`} × {line.quantity}
                    </span>
                    <span>
                      {formatPrice((item ? Number(effectivePrice(item)) : 0) * line.quantity)}
                    </span>
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() =>
                        setCart((current) =>
                          current.filter((l) => l.menuItemId !== line.menuItemId),
                        )
                      }
                    >
                      Xóa
                    </button>
                  </li>
                );
              })}
              <li className="cart-total">
                <span>Tổng tạm tính</span>
                <span>{formatPrice(cartTotal)}</span>
              </li>
            </ul>
          )}

          <button className="button primary" disabled={busy}>
            Tạo đơn hàng
          </button>
        </form>
        {message && <p className="form-message form-message-success">{message}</p>}
      </section>

      {error && <p className="banner banner-danger">{error}</p>}

      <div className="tabs-row">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={statusFilter === tab ? 'active' : ''}
            onClick={() => setStatusFilter(tab)}
          >
            {tab === 'all' ? 'Tất cả' : orderStatusLabel[tab]}
          </button>
        ))}
      </div>

      <div className="order-board">
        {loading ? (
          <p className="empty">Đang tải đơn hàng…</p>
        ) : visibleOrders.length ? (
          visibleOrders.map((order) => {
            const items = itemsByOrderId.get(order.id) ?? [];
            const isLocked = order.status === 'BILLED' || order.status === 'PAID';
            return (
              <article className="order-card" key={order.id}>
                <div className="order-card-head">
                  <div>
                    <h3>Đơn #{order.id} · Bàn {tableNameById.get(order.tableId) ?? order.tableId}</h3>
                    <span className="hint">{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div className="order-card-head-right">
                    <Badge tone={orderStatusTone[order.status ?? 'NEW']}>
                      {orderStatusLabel[order.status ?? 'NEW']}
                    </Badge>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                  </div>
                </div>
                {order.note && <p className="hint">Ghi chú: {order.note}</p>}
                {order.reservationId && (
                  <p className="hint">Liên kết đặt bàn #{order.reservationId}</p>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Món</th>
                        <th>SL</th>
                        <th>Đơn giá</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const menuItem = menuById.get(item.menuItemId);
                        const editValue = quantityEdits[item.id] ?? String(item.quantity);
                        return (
                          <tr key={item.id}>
                            <td>{menuItem?.name ?? `Món #${item.menuItemId}`}</td>
                            <td>
                              {item.status === 'PENDING' ? (
                                <span className="qty-edit">
                                  <input
                                    type="number"
                                    min={1}
                                    value={editValue}
                                    onChange={(event) =>
                                      setQuantityEdits((current) => ({
                                        ...current,
                                        [item.id]: event.target.value,
                                      }))
                                    }
                                  />
                                  {editValue !== String(item.quantity) && (
                                    <button
                                      className="button ghost small"
                                      disabled={busy}
                                      onClick={() => saveQuantity(order.id, item.id)}
                                    >
                                      Lưu
                                    </button>
                                  )}
                                </span>
                              ) : (
                                item.quantity
                              )}
                            </td>
                            <td>{formatPrice(item.priceAtTime)}</td>
                            <td>
                              <Badge tone={orderItemStatusTone[item.status ?? 'PENDING']}>
                                {orderItemStatusLabel[item.status ?? 'PENDING']}
                              </Badge>
                            </td>
                            <td className="row-actions">
                              {item.status === 'PENDING' && (
                                <>
                                  <button
                                    className="button ghost small"
                                    disabled={busy}
                                    onClick={() => advanceItemStatus(item.id, 'COOKING')}
                                  >
                                    Bắt đầu nấu
                                  </button>
                                  <button
                                    className="button ghost small danger"
                                    disabled={busy}
                                    onClick={() => cancelItem(order.id, item.id)}
                                  >
                                    Hủy món
                                  </button>
                                </>
                              )}
                              {item.status === 'COOKING' && (
                                <button
                                  className="button ghost small"
                                  disabled={busy}
                                  onClick={() => advanceItemStatus(item.id, 'DONE')}
                                >
                                  Hoàn thành
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty">
                            Chưa có món nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!isLocked && (
                  <div className="add-items-block">
                    {addItemsOrderId === order.id ? (
                      <div className="item-picker">
                        <select
                          value={pickMenuItem}
                          onChange={(event) => setPickMenuItem(event.target.value)}
                        >
                          <option value="">Chọn món</option>
                          {activeMenu.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={pickQuantity}
                          onChange={(event) => setPickQuantity(event.target.value)}
                        />
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={addToAddCart}
                        >
                          Thêm
                        </button>
                        {addCart.length > 0 && (
                          <ul className="cart-list">
                            {addCart.map((line) => (
                              <li key={line.menuItemId}>
                                <span>
                                  {menuById.get(line.menuItemId)?.name} × {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="button ghost small"
                                  onClick={() =>
                                    setAddCart((current) =>
                                      current.filter((l) => l.menuItemId !== line.menuItemId),
                                    )
                                  }
                                >
                                  Xóa
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="row-actions">
                          <button
                            className="button primary small"
                            disabled={busy}
                            onClick={() => submitAddItems(order.id)}
                          >
                            Xác nhận gọi thêm
                          </button>
                          <button
                            className="button ghost small"
                            onClick={() => {
                              setAddItemsOrderId(null);
                              setAddCart([]);
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="button ghost small"
                        onClick={() => {
                          setAddItemsOrderId(order.id);
                          setAddCart([]);
                        }}
                      >
                        Gọi thêm món
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <p className="empty">Chưa có đơn hàng nào.</p>
        )}
      </div>
    </main>
  );
}

'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { menuItemsApi } from '../../../lib/api';
import { categoryIcon, findDishPhoto } from '../../../lib/dish-photos';
import { formatPrice } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import type { MenuItem } from '../../../lib/types';
import { usePolling } from '../../../lib/use-polling';

interface EditState {
  name: string;
  description: string;
  price: string;
  category: string;
  sale_price: string;
  is_flash_sale: boolean;
}

function toEditState(item: MenuItem): EditState {
  return {
    name: item.name,
    description: item.description ?? '',
    price: String(item.price ?? ''),
    category: item.category ?? '',
    sale_price: item.sale_price ? String(item.sale_price) : '',
    is_flash_sale: Boolean(item.is_flash_sale),
  };
}

export default function MenuPage() {
  const { user, loading: checkingSession } = useSession();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const canManage = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const loadMenu = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const result = await menuItemsApi.list();
      setMenu(result);
      if (!opts?.silent) setError('');
    } catch (err) {
      if (!opts?.silent) {
        setError(err instanceof Error ? err.message : 'Không thể tải thực đơn.');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);
  usePolling(() => loadMenu({ silent: true }), 15000);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((item) => item.category && set.add(item.category));
    return Array.from(set).sort();
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term);
      const matchesCategory = category === 'all' || item.category === category;
      return matchesTerm && matchesCategory;
    });
  }, [menu, search, category]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await menuItemsApi.create({
        name: String(form.get('name') ?? '').trim(),
        description: String(form.get('description') ?? '').trim() || undefined,
        price: Number(form.get('price')),
        category: String(form.get('category') ?? '').trim() || undefined,
      });
      setMessage('Đã thêm món ăn mới.');
      (event.target as HTMLFormElement).reset();
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm món ăn.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setEditState(toEditState(item));
    setMessage('');
    setError('');
  }

  async function saveEdit(id: number) {
    if (!editState) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await menuItemsApi.update(id, {
        name: editState.name.trim(),
        description: editState.description.trim() || undefined,
        price: Number(editState.price),
        category: editState.category.trim() || undefined,
        sale_price: editState.sale_price ? Number(editState.sale_price) : 0,
        is_flash_sale: editState.is_flash_sale,
      });
      setMessage('Đã cập nhật món ăn.');
      setEditingId(null);
      setEditState(null);
      await loadMenu();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật món ăn.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">THỰC ĐƠN</p>
          <h1>Món ăn của nhà hàng</h1>
        </div>
        <button className="button ghost small" onClick={() => loadMenu()} disabled={loading}>
          Làm mới
        </button>
      </div>

      <div className="filter-row">
        <input
          className="search-input"
          placeholder="Tìm món ăn…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="banner banner-danger">{error}</p>}

      <div className="menu-grid">
        {loading ? (
          <p className="empty">Đang tải thực đơn…</p>
        ) : filteredMenu.length ? (
          filteredMenu.map((item) => {
            const photo = findDishPhoto(item.name);
            return (
              <article className="menu-card" key={item.id}>
                <div className="menu-card-media">
                  {photo ? (
                    <Image
                      src={photo.photo}
                      alt={item.name}
                      fill
                      sizes="(max-width: 850px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="menu-card-placeholder">
                      <span>{categoryIcon(item.category)}</span>
                    </div>
                  )}
                  {item.is_flash_sale && item.sale_price && (
                    <span className="menu-card-flash-badge badge badge-warning">
                      Flash sale
                    </span>
                  )}
                </div>
                <div className="menu-card-body">
                  <span className="menu-card-category">{item.category || 'Món ăn'}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description || 'Món ngon được phục vụ trong ngày.'}</p>
                  <div className="menu-price-row">
                    {item.is_flash_sale && item.sale_price ? (
                      <>
                        <s className="menu-old-price">{formatPrice(item.price)}</s>
                        <strong>{formatPrice(item.sale_price)}</strong>
                      </>
                    ) : (
                      <strong>{formatPrice(item.price)}</strong>
                    )}
                  </div>
                  {canManage && (
                    <button
                      className="button ghost small menu-edit-btn"
                      onClick={() => startEdit(item)}
                    >
                      Sửa món
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty">Không tìm thấy món ăn phù hợp.</p>
        )}
      </div>

      {checkingSession ? null : canManage ? (
        <section className="panel manage-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">QUẢN LÝ THỰC ĐƠN</p>
              <h2>Thêm món ăn mới</h2>
            </div>
          </div>
          <form className="field-grid" onSubmit={handleCreate}>
            <label>
              Tên món
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Danh mục
              <input name="category" placeholder="Khai vị, món chính…" />
            </label>
            <label>
              Giá (VNĐ)
              <input name="price" type="number" min={0} step={1000} required />
            </label>
            <label className="field-span">
              Mô tả
              <textarea name="description" rows={2} />
            </label>
            <button className="button primary" disabled={busy}>
              Thêm món ăn
            </button>
          </form>
          {message && <p className="form-message form-message-success">{message}</p>}

          {editingId !== null && editState && (
            <div className="edit-drawer">
              <div className="panel-heading">
                <h3>Chỉnh sửa món #{editingId}</h3>
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
                  Tên món
                  <input
                    value={editState.name}
                    onChange={(event) =>
                      setEditState({ ...editState, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Danh mục
                  <input
                    value={editState.category}
                    onChange={(event) =>
                      setEditState({ ...editState, category: event.target.value })
                    }
                  />
                </label>
                <label>
                  Giá (VNĐ)
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editState.price}
                    onChange={(event) =>
                      setEditState({ ...editState, price: event.target.value })
                    }
                  />
                </label>
                <label>
                  Giá flash sale (VNĐ)
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editState.sale_price}
                    onChange={(event) =>
                      setEditState({ ...editState, sale_price: event.target.value })
                    }
                  />
                </label>
                <label className="field-span">
                  Mô tả
                  <textarea
                    rows={2}
                    value={editState.description}
                    onChange={(event) =>
                      setEditState({ ...editState, description: event.target.value })
                    }
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={editState.is_flash_sale}
                    onChange={(event) =>
                      setEditState({
                        ...editState,
                        is_flash_sale: event.target.checked,
                      })
                    }
                  />
                  Đang chạy flash sale
                </label>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => saveEdit(editingId)}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

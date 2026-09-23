'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { authApi, menuItemsApi } from '../../lib/api';
import { DISH_PHOTOS } from '../../lib/dish-photos';
import { formatPrice } from '../../lib/format';
import { useSession } from '../../lib/session';
import type { MenuItem } from '../../lib/types';
import { usePolling } from '../../lib/use-polling';

function effectivePrice(item: MenuItem) {
  return item.is_flash_sale && item.sale_price ? item.sale_price : item.price;
}

export default function Home() {
  const { user, loading: checkingSession, setUser } = useSession();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);

  const loadMenu = useCallback(async () => {
    setMenu(await menuItemsApi.list().catch(() => []));
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);
  usePolling(loadMenu, 15000);

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

  if (checkingSession) {
    return (
      <main className="center-screen">Đang kiểm tra phiên đăng nhập…</main>
    );
  }

  const dishes = DISH_PHOTOS.map((dish) => {
    const matched = menu.find((item) =>
      item.name.toLowerCase().includes(dish.keyword),
    );
    return {
      photo: matched?.imageUrl || dish.photo,
      name: matched?.name ?? dish.label,
      price: matched ? formatPrice(effectivePrice(matched)) : null,
    };
  });

  return (
    <main>
      <section className="home-hero" id="top">
        <Image
          src="/images/restaurant-interior.jpg"
          alt="Không gian nhà hàng"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
        <div className="home-hero-overlay">
          <p className="eyebrow">RESTAURANT HUB</p>
          <h1>Một nơi để vận hành nhà hàng và gặp khách hàng.</h1>
        </div>
      </section>

      {!user ? (
        <section className="auth-shell auth-shell-solo">
          <div className="auth-card">
            <p className="auth-card-intro">
              Đăng nhập để đặt bàn, gọi món và tham gia lớp dạy nấu ăn online.
            </p>
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
      ) : null}

      <section className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MÓN NỔI BẬT</p>
            <h2>Hương vị được yêu thích</h2>
          </div>
          <Link className="button ghost small" href="/menu">
            Xem toàn bộ thực đơn
          </Link>
        </div>
        <div className="dish-showcase">
          {dishes.map((dish) => (
            <figure className="dish-photo-card" key={dish.photo}>
              <div className="dish-photo-media">
                <Image src={dish.photo} alt={dish.name} fill sizes="(max-width: 850px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
              </div>
              <figcaption>
                <span>{dish.name}</span>
                {dish.price && <strong>{dish.price}</strong>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { roleLabel } from '../lib/labels';
import { useSession } from '../lib/session';
import type { Role } from '../lib/types';

interface NavLink {
  href: string;
  label: string;
  roles?: Role[];
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Trang chủ' },
  { href: '/menu', label: 'Thực đơn' },
  { href: '/tables', label: 'Bàn ăn' },
  { href: '/bookings', label: 'Đặt bàn' },
  { href: '/classes', label: 'Lớp học' },
  { href: '/orders', label: 'Đơn hàng', roles: ['STAFF', 'ADMIN'] },
  { href: '/payments', label: 'Thanh toán', roles: ['STAFF', 'ADMIN'] },
  { href: '/accounts', label: 'Người dùng', roles: ['ADMIN'] },
];

export default function Topbar() {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.roles || (user && link.roles.includes(user.role)),
  );

  async function handleLogout() {
    setBusy(true);
    await logout();
    setBusy(false);
    setMenuOpen(false);
  }

  return (
    <header className="topbar app-topbar">
      <Link className="brand" href="/" aria-label="Restaurant Hub">
        <span className="brand-mark">R</span>
        <span>Restaurant Hub</span>
      </Link>

      <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="user-actions">
        {user ? (
          <>
            <span className={`role role-${user.role.toLowerCase()}`}>
              {roleLabel[user.role]}
            </span>
            <span className="topbar-name">{user.name}</span>
            <button
              className="button ghost small"
              onClick={handleLogout}
              disabled={busy}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <Link className="button ghost small" href="/">
            Đăng nhập
          </Link>
        )}
        <button
          type="button"
          className="nav-toggle"
          aria-label="Mở menu điều hướng"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

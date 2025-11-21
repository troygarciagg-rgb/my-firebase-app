import { Link, useLocation } from 'react-router-dom';

const baseLinks = {
  host: [
    { path: '/host/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/host/my-listings', label: 'My Listings', icon: '🏠' },
    { path: '/host/add-listing', label: 'Add Listing', icon: '➕' },
    { path: '/host/view-bookings', label: 'Bookings', icon: '🗓️' },
    { path: '/host/messages', label: 'Messages', icon: '💬' },
    { path: '/host/calendar', label: 'Calendar', icon: '📆' },
    { path: '/host/payment-methods', label: 'Payment Methods', icon: '💳' },
  ],
  guest: [
    { path: '/guest/home', label: 'Home', icon: '🏠' },
    { path: '/guest/browse', label: 'Browse', icon: '🧭' },
    { path: '/guest/recommendations', label: 'Recommendations', icon: '⭐' },
    { path: '/guest/favorites', label: 'Favorites', icon: '❤️' },
    { path: '/guest/my-bookings', label: 'My Bookings', icon: '🧾' },
    { path: '/guest/my-coupons', label: 'My Coupons', icon: '🎟️' },
    { path: '/guest/messages', label: 'Messages', icon: '💬' },
    { path: '/guest/wishlist', label: 'Wishlist', icon: '💖' },
  ],
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/listings', label: 'Listings', icon: '🏘️' },
    { path: '/admin/bookings', label: 'Bookings', icon: '🗂️' },
    { path: '/admin/reports', label: 'Reports', icon: '📑' },
  ],
};

export default function Sidebar({ role }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const links = baseLinks[role] || baseLinks.guest;
  const panelTitle =
    role === 'host' ? 'Host Panel' : role === 'admin' ? 'Admin Panel' : 'Guest Panel';

  return (
    <aside className="hidden md:flex w-64 bg-[#0b1220] text-white min-h-screen flex-col border-r border-white/5 shadow-[8px_0_30px_rgba(2,6,23,0.45)]">
      <div className="px-6 py-8 border-b border-white/5">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Control Center</p>
        <h2 className="text-2xl font-bold tracking-tight">{panelTitle}</h2>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
              isActive(link.path)
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-cyan-500/30 text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-2">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
            isActive('/settings')
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-cyan-500/30 text-white'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className="text-lg">⚙️</span>
          Settings
        </Link>
      </div>
      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <p className="font-semibold mb-1">Need help?</p>
          <p className="text-xs text-white/60">Contact support anytime</p>
        </div>
      </div>
    </aside>
  );
}


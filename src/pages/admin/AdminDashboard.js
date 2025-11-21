import { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, getListings, getAllUsers, getAllTransactions } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';

const colorMap = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  cyan: 'text-cyan-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  indigo: 'text-indigo-600'
};

const StatCard = ({ label, value, accent = 'blue' }) => {
  const colorClass = colorMap[accent] || 'text-gray-900';
  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{value}</p>
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardStats = await getDashboardStats();
      const [listingsData, usersData, transactionsData] = await Promise.all([
        getListings(), 
        getAllUsers(),
        getAllTransactions()
      ]);
      setStats(dashboardStats);
      setListings(listingsData);
      setUsers(usersData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      setError(`Failed to load dashboard data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const categoryCounts = useMemo(() => {
    if (!listings || listings.length === 0) return {};
    const counts = {};
    listings.forEach((listing) => {
      const key = listing.category || 'Uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [listings]);

  const roleCounts = useMemo(() => {
    if (!users || users.length === 0) return { admin: 0, host: 0, guest: 0 };
    const counts = { admin: 0, host: 0, guest: 0 };
    users.forEach((user) => {
      const role = user.role || 'guest';
      if (counts.hasOwnProperty(role)) {
        counts[role] = (counts[role] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  const listingNameMap = useMemo(() => {
    if (!listings || listings.length === 0) return {};
    const map = {};
    listings.forEach((listing) => {
      if (listing && listing.id) {
        map[listing.id] = listing.title || listing.id;
      }
    });
    return map;
  }, [listings]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="admin" />
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar role="admin" />
        <div className="flex-1 p-6 md:p-10 space-y-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-blue-500">Control Center</p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Real-time overview of bookings, payouts, and platform activity.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={loadStats}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Bookings" value={stats?.totalBookings || 0} accent="blue" />
            <StatCard
              label="Gross Revenue"
              value={`$${(stats?.totalGross || 0).toLocaleString()}`}
              accent="green"
            />
            <StatCard
              label="Admin Earnings (5%)"
              value={`$${(stats?.adminEarnings || 0).toLocaleString()}`}
              accent="purple"
            />
            <StatCard
              label="Host Payouts (95%)"
              value={`$${(stats?.hostPayouts || 0).toLocaleString()}`}
              accent="cyan"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Monthly Earnings</h2>
                <p className="text-sm text-gray-500">Last 12 months</p>
              </div>
              {stats?.monthlyRevenue?.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="gross" stroke="#2563eb" strokeWidth={2} name="Gross" />
                      <Line type="monotone" dataKey="admin" stroke="#a855f7" strokeWidth={2} name="Admin" />
                      <Line type="monotone" dataKey="host" stroke="#06b6d4" strokeWidth={2} name="Host" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500">Not enough data to plot monthly earnings.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Booking status</h2>
              {stats?.statusCounts &&
                Object.entries(stats.statusCounts).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between text-sm text-gray-600 capitalize">
                      <span>{status}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-teal-500"
                        style={{
                          width: `${Math.min(100, (count / (stats.totalBookings || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Published listings" value={stats?.publishedListings || 0} accent="emerald" />
            <StatCard label="Draft listings" value={stats?.pendingListings || 0} accent="amber" />
            <StatCard label="Hosts" value={roleCounts.host || 0} accent="rose" />
            <StatCard label="Guests" value={roleCounts.guest || 0} accent="indigo" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Listings</h2>
              <div className="space-y-3">
                {stats?.topListings?.length ? (
                  stats.topListings.map((listing) => (
                    <div
                      key={listing.listingId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {listingNameMap[listing.listingId] || listing.listingId}
                        </p>
                        <p className="text-xs text-gray-500">Listing ID: {listing.listingId}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{listing.count} bookings</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No booking data yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Listings by category</h2>
              <div className="space-y-3">
                {Object.keys(categoryCounts).length ? (
                  Object.entries(categoryCounts).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{category}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No listings yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Host Earnings / Payouts Section */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Host Earnings & Payouts</h2>
              <p className="text-sm text-gray-500 mt-1">Track all host payouts and transaction details</p>
            </div>
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <p className="text-lg font-semibold text-gray-700">No transactions yet</p>
                <p>Transactions will appear here after guests complete bookings.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide text-xs">
                    <tr>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Listing</th>
                      <th className="px-6 py-3 text-left">Host ID</th>
                      <th className="px-6 py-3 text-left">Total Amount</th>
                      <th className="px-6 py-3 text-left">Admin Fee (5%)</th>
                      <th className="px-6 py-3 text-left">Host Payout (95%)</th>
                      <th className="px-6 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {transactions.slice(0, 20).map((tx) => {
                      const status = tx.payoutStatus || tx.status || 'UNKNOWN';
                      const statusClass = 
                        status === 'SENT' || status === 'SUCCESS' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'PENDING' || status === 'payoutPending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700';
                      
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-500">
                            {tx.createdAt?.toDate 
                              ? tx.createdAt.toDate().toLocaleDateString()
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {tx.listingTitle || tx.listingId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                            {tx.hostId?.slice(0, 8) + '...' || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-semibold">
                            ${(tx.totalAmount || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-purple-600 font-semibold">
                            ${(tx.adminFee || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-cyan-600 font-semibold">
                            ${(tx.hostPayout || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


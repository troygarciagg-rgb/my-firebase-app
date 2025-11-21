import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getListings, getBookings, getHostTransactions } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function HostDashboard() {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    revenue: 0,
    totalPayouts: 0,
    pendingPayouts: 0
  });

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const mergeListings = (...arrays) => {
    const map = new Map();
    arrays.flat().forEach((listing) => {
      if (listing?.id) {
        map.set(listing.id, listing);
      }
    });
    return Array.from(map.values());
  };

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      console.log('[HostDashboard] Loading data for host:', currentUser.uid);
      const [hostListings, ownerListings, bookingsData, transactionsData] = await Promise.all([
        getListings({ hostId: currentUser.uid }),
        getListings({ ownerId: currentUser.uid }),
        getBookings({ hostId: currentUser.uid }),
        getHostTransactions(currentUser.uid).catch(err => {
          console.error('[HostDashboard] Error loading transactions:', err);
          return []; // Return empty array on error
        })
      ]);

      console.log('[HostDashboard] Data loaded:', {
        listings: hostListings.length + ownerListings.length,
        bookings: bookingsData.length,
        transactions: transactionsData.length
      });

      const listingsData = mergeListings(hostListings, ownerListings);
      setListings(listingsData);
      setBookings(bookingsData);
      setTransactions(transactionsData);

      const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
      const revenue = bookingsData
        .filter(b => b.status === 'accepted' || b.status === 'completed' || b.status === 'paid')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      
      // Calculate payout stats - check both payoutStatus and status fields
      const totalPayouts = transactionsData
        .filter(tx => {
          const status = tx.payoutStatus || tx.status || '';
          return status === 'SENT' || status === 'SUCCESS' || status === 'payout-sent';
        })
        .reduce((sum, tx) => sum + (Number(tx.hostPayout) || 0), 0);
      
      const pendingPayouts = transactionsData
        .filter(tx => {
          const status = tx.payoutStatus || tx.status || '';
          return status === 'PENDING' || status === 'payoutPending' || status === 'payout-pending';
        })
        .reduce((sum, tx) => sum + (Number(tx.hostPayout) || 0), 0);

      setStats({
        totalListings: listingsData.length,
        totalBookings: bookingsData.length,
        pendingBookings,
        revenue,
        totalPayouts,
        pendingPayouts
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="host" />
          <div className="flex-1 p-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar role="host" />
        <div className="flex-1 bg-slate-50 min-h-screen">
          <section className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-900/20">
            <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start gap-8">
              <div className="flex-1 space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Host Overview</p>
                <h1 className="text-3xl md:text-4xl font-bold">
                  Welcome back, {currentUser?.displayName || 'Host'} 👋
                </h1>
                <p className="text-white/85 max-w-2xl">
                  Track performance in real time, manage bookings, and keep your listings in front
                  of the right guests.
                </p>
                <div className="flex gap-4">
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">Listings</p>
                    <p className="text-2xl font-semibold">{stats.totalListings}</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">Bookings</p>
                    <p className="text-2xl font-semibold">{stats.totalBookings}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/20 p-6 space-y-4 w-full md:w-80 backdrop-blur">
                <p className="text-sm text-white/70 uppercase tracking-[0.3em]">Quick actions</p>
                <Link
                  to="/host/add-listing"
                  className="block w-full text-center bg-white text-blue-700 font-semibold py-3 rounded-2xl shadow-lg shadow-blue-900/20 hover:-translate-y-0.5 transition"
                >
                  Create new listing
                </Link>
                <Link
                  to="/host/my-listings"
                  className="block w-full text-center border border-white/40 text-white font-semibold py-3 rounded-2xl hover:bg-white/10 transition"
                >
                  Manage listings
                </Link>
              </div>
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
              {[
                {
                  label: 'Total Listings',
                  value: stats.totalListings,
                  sub: `${listings.length ? listings.length : 'No'} active`,
                  accent: 'from-blue-500 to-blue-600',
                  icon: '🏠'
                },
                {
                  label: 'Total Bookings',
                  value: stats.totalBookings,
                  sub: `${bookings.length ? bookings.length : 'No'} lifetime`,
                  accent: 'from-cyan-500 to-teal-500',
                  icon: '📅'
                },
                {
                  label: 'Pending Bookings',
                  value: stats.pendingBookings,
                  sub: 'Awaiting your response',
                  accent: 'from-amber-400 to-orange-500',
                  icon: '⏳'
                },
                {
                  label: 'Total Revenue',
                  value: `$${stats.revenue.toFixed(2)}`,
                  sub: 'Accepted & completed',
                  accent: 'from-emerald-400 to-green-500',
                  icon: '💰'
                },
                {
                  label: 'Total Payouts',
                  value: `$${stats.totalPayouts.toFixed(2)}`,
                  sub: stats.pendingPayouts > 0 ? `$${stats.pendingPayouts.toFixed(2)} pending` : 'All sent',
                  accent: 'from-teal-400 to-cyan-500',
                  icon: '💸'
                }
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${card.accent} flex items-center justify-center text-xl text-white mb-4`}>
                    {card.icon}
                  </div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Recent Bookings</p>
                  <h2 className="text-xl font-bold text-gray-900">Latest guest activity</h2>
                </div>
                <Link
                  to="/host/view-bookings"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              {bookings.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <p className="text-lg font-semibold text-gray-700">No bookings yet</p>
                  <p>Keep your listings up to date to attract new guests.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide text-xs">
                      <tr>
                        <th className="px-6 py-3 text-left">Listing</th>
                        <th className="px-6 py-3 text-left">Guest</th>
                        <th className="px-6 py-3 text-left">Check In</th>
                        <th className="px-6 py-3 text-left">Check Out</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {bookings.slice(0, 5).map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {booking.listingTitle || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-500">{booking.guestEmail || 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {booking.checkIn?.toDate?.().toLocaleDateString() || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {booking.checkOut?.toDate?.().toLocaleDateString() || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                booking.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : booking.status === 'declined'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-semibold">
                            ${booking.totalPrice || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout History Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Payout History</p>
                  <h2 className="text-xl font-bold text-gray-900">Your earnings & payouts</h2>
                </div>
                <Link
                  to="/host/payment-methods"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                >
                  Payment Settings
                </Link>
              </div>
              {transactions.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <p className="text-lg font-semibold text-gray-700">No payouts yet</p>
                  <p>Payouts will appear here after guests complete bookings.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide text-xs">
                      <tr>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Listing</th>
                        <th className="px-6 py-3 text-left">Total Amount</th>
                        <th className="px-6 py-3 text-left">Your Payout (95%)</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Batch ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {transactions.slice(0, 10).map((tx) => {
                        const status = tx.payoutStatus || tx.status || 'UNKNOWN';
                        const statusClass = 
                          status === 'SENT' || status === 'SUCCESS' || status === 'payout-sent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'PENDING' || status === 'payoutPending' || status === 'payout-pending'
                            ? 'bg-amber-100 text-amber-700'
                            : status === 'payout-failed' || status === 'FAILED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-gray-100 text-gray-700';
                        
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
                            <td className="px-6 py-4 text-gray-700">
                              ${(tx.totalAmount || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-emerald-600 font-semibold">
                              ${(tx.hostPayout || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                              {tx.payoutBatchId ? tx.payoutBatchId.slice(0, 12) + '...' : 'N/A'}
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
      </div>
    </>
  );
}


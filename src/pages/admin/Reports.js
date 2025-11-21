import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDashboardStats, getListings, getBookings, getAllUsers } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

const monetaryStatuses = ['paid', 'accepted', 'completed'];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const dashboardStats = await getDashboardStats();
      const [listingDocs, bookingDocs, userDocs] = await Promise.all([
        getListings(),
        getBookings(),
        getAllUsers()
      ]);

      setListings(listingDocs);
      setBookings(bookingDocs);

      const categoryStats = {};
      listingDocs.forEach((listing) => {
        const key = listing.category || 'Uncategorized';
        if (!categoryStats[key]) {
          categoryStats[key] = { total: 0, published: 0, draft: 0, revenue: 0 };
        }
        categoryStats[key].total += 1;
        if (listing.status === 'published') categoryStats[key].published += 1;
        if (listing.status === 'draft') categoryStats[key].draft += 1;
      });

      bookingDocs.forEach((booking) => {
        const listing = listingDocs.find((l) => l.id === booking.listingId);
        if (!listing) return;
        if (!categoryStats[listing.category]) {
          categoryStats[listing.category] = { total: 0, published: 0, draft: 0, revenue: 0 };
        }
        if (monetaryStatuses.includes((booking.status || '').toLowerCase())) {
          const value = Number(booking.netAmount ?? booking.totalPrice ?? 0);
          categoryStats[listing.category].revenue += value;
        }
      });

      const roleCounts = {
        admin: userDocs.filter((u) => u.role === 'admin').length,
        host: userDocs.filter((u) => u.role === 'host').length,
        guest: userDocs.filter((u) => u.role === 'guest').length
      };

      setStats({
        ...dashboardStats,
        categoryStats,
        roleCounts,
        totalListings: listingDocs.length,
        totalBookings: bookingDocs.length,
        totalUsers: userDocs.length
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const listingNameMap = useMemo(() => {
    const map = {};
    listings.forEach((listing) => {
      map[listing.id] = listing.title || listing.id;
    });
    return map;
  }, [listings]);

  const bookingRows = useMemo(() => {
    return bookings
      .filter((booking) => monetaryStatuses.includes((booking.status || '').toLowerCase()))
      .map((booking) => {
        const gross = Number(booking.netAmount ?? booking.totalPrice ?? 0);
        const admin = Number(booking.adminFee ?? Number((gross * 0.05).toFixed(2)));
        const host = Number(booking.hostPayout ?? Number((gross - admin).toFixed(2)));
        return {
          ...booking,
          listingTitle: listingNameMap[booking.listingId] || booking.listingId,
          gross,
          admin,
          host
        };
      });
  }, [bookings, listingNameMap]);

  const handleGeneratePdf = () => {
    if (!stats) return;
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to generate a PDF report?\n\n' +
      'This will create a downloadable PDF file with all booking data, revenue, payouts, and coupon usage.\n\n' +
      'Click OK to proceed or Cancel to abort.'
    );
    
    if (!confirmed) {
      return; // User cancelled
    }
    
    const doc = new jsPDF();
    const margin = 24;
    doc.setFontSize(18);
    doc.text('Admin Performance Report', margin, 32);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 48);
    doc.text(`Total Bookings: ${stats.totalBookings}`, margin, 64);
    doc.text(`Gross Revenue: $${stats.totalGross?.toLocaleString() || '0.00'}`, margin, 78);
    doc.text(`Admin Earnings (5%): $${stats.adminEarnings?.toLocaleString() || '0.00'}`, margin, 92);
    doc.text(`Host Payouts (95%): $${stats.hostPayouts?.toLocaleString() || '0.00'}`, margin, 106);

    autoTable(doc, {
      startY: 120,
      head: [['Listing', 'Guest', 'Check-In', 'Check-Out', 'Gross', 'Admin', 'Host', 'Status']],
      body: bookingRows.map((booking) => [
        booking.listingTitle,
        booking.guestEmail || booking.guestId || '—',
        booking.checkIn || '—',
        booking.checkOut || '—',
        `$${booking.gross.toFixed(2)}`,
        `$${booking.admin.toFixed(2)}`,
        `$${booking.host.toFixed(2)}`,
        booking.status
      ]),
      styles: { fontSize: 9 }
    });

    doc.save(`admin-report-${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="admin" />
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
        <Sidebar role="admin" />
        <div className="flex-1 p-8">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Detailed revenue, payout, and booking summaries.</p>
            </div>
            <button
              onClick={handleGeneratePdf}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold shadow hover:from-blue-700 hover:to-teal-600"
            >
              Generate PDF
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Listings</p>
                  <p className="text-2xl font-bold">{stats?.totalListings || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Bookings</p>
                  <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${(stats?.totalGross ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">User Distribution</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Admins</span>
                  <span className="font-bold">{stats?.roleCounts?.admin || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hosts</span>
                  <span className="font-bold">{stats?.roleCounts?.host || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guests</span>
                  <span className="font-bold">{stats?.roleCounts?.guest || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Category Statistics</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Draft</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats?.categoryStats && Object.entries(stats.categoryStats).map(([category, data]) => (
                      <tr key={category}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {data.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {data.published}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                          {data.draft}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${data.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBookings } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

const statusStyles = {
  paid: { label: 'Awaiting Host', classes: 'bg-purple-100 text-purple-700' },
  payoutpending: { label: 'Payout Pending', classes: 'bg-indigo-100 text-indigo-700' },
  accepted: { label: 'Confirmed', classes: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', classes: 'bg-blue-100 text-blue-700' },
  declined: { label: 'Declined', classes: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-700' },
  canceled: { label: 'Cancelled', classes: 'bg-red-100 text-red-700' },
  default: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' }
};

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'active', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' }
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  return new Date(value);
};

export default function MyBookings() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (currentUser) {
      loadBookings();
    }
  }, [currentUser]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await getBookings({ guestId: currentUser.uid });
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const enhancedBookings = useMemo(() => {
    return bookings.map((booking) => {
      const checkInDate = normalizeTimestamp(booking.checkIn);
      const checkOutDate = normalizeTimestamp(booking.checkOut);
      const nights = checkInDate && checkOutDate ? Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))) : 0;
      const statusKey = (booking.status || 'pending').toLowerCase();
      const style = statusStyles[statusKey] || statusStyles.default;
      return {
        ...booking,
        checkInDate,
        checkOutDate,
        nights,
        statusKey,
        statusStyle: style
      };
    });
  }, [bookings]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summary = useMemo(() => {
    return enhancedBookings.reduce(
      (acc, booking) => {
        acc.total += 1;
        if (booking.checkInDate && booking.checkInDate >= today) acc.upcoming += 1;
        if (
          booking.statusKey === 'completed' ||
          (booking.checkOutDate && booking.checkOutDate < today)
        ) {
          acc.completed += 1;
        }
        if (['cancelled', 'canceled', 'declined'].includes(booking.statusKey)) {
          acc.cancelled += 1;
        }
        acc.nights += booking.nights || 0;
        acc.amount += booking.netAmount || booking.totalPrice || 0;
        return acc;
      },
      { total: 0, upcoming: 0, completed: 0, cancelled: 0, nights: 0, amount: 0 }
    );
  }, [enhancedBookings, today]);

  const filteredBookings = useMemo(() => {
    return enhancedBookings.filter((booking) => {
      if (filter === 'upcoming') {
        return booking.checkInDate && booking.checkInDate >= today;
      }
      if (filter === 'active') {
        return (
          booking.checkInDate &&
          booking.checkOutDate &&
          today >= booking.checkInDate &&
          today < booking.checkOutDate
        );
      }
      if (filter === 'completed') {
        return (
          booking.statusKey === 'completed' ||
          (booking.checkOutDate && booking.checkOutDate < today)
        );
      }
      if (filter === 'cancelled') {
        return ['cancelled', 'canceled', 'declined'].includes(booking.statusKey);
      }
      return true;
    });
  }, [enhancedBookings, filter, today]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="guest" />
          <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your bookings...</p>
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
        <Sidebar role="guest" />
        <div className="flex-1 p-6 md:p-10 space-y-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Journey log</p>
                <h1 className="text-3xl md:text-4xl font-bold mt-2">Your Bookings</h1>
                <p className="text-white/80 mt-2 text-sm md:text-base">
                  Keep track of every stay, from upcoming getaways to past adventures.
                </p>
              </div>
              <Link
                to="/guest/browse"
                className="px-5 py-3 bg-white text-blue-600 rounded-2xl font-semibold shadow hover:shadow-lg transition"
              >
                Discover more stays
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Trips</p>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-white/80 mt-1">Total bookings</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Upcoming</p>
                <p className="text-2xl font-bold">{summary.upcoming}</p>
                <p className="text-xs text-white/80 mt-1">Future stays</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Nights</p>
                <p className="text-2xl font-bold">{summary.nights}</p>
                <p className="text-xs text-white/80 mt-1">Total nights booked</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.amount)}</p>
                <p className="text-xs text-white/80 mt-1">Across all stays</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  filter === option.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
              <p className="text-xl font-semibold text-gray-900 mb-2">No bookings to show</p>
              <p className="text-gray-500 mb-6">
                When you reserve a stay, it will appear here with full details and status tracking.
              </p>
              <Link
                to="/guest/browse"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-semibold shadow hover:bg-blue-500 transition"
              >
                Start exploring
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                        #{booking.transactionId || booking.id}
                      </p>
                      <h3 className="text-2xl font-semibold text-gray-900 mt-1">
                        {booking.listingTitle || 'Booking'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {booking.nights} night{booking.nights === 1 ? '' : 's'} •{' '}
                        {booking.numberOfGuests || 1} guest
                        {booking.numberOfGuests > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${booking.statusStyle.classes}`}>
                      {booking.statusStyle.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm text-gray-600">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-1">Dates</p>
                      <p className="text-gray-900 font-semibold">
                        {booking.checkInDate
                          ? booking.checkInDate.toLocaleDateString()
                          : 'TBD'}{' '}
                        –{' '}
                        {booking.checkOutDate
                          ? booking.checkOutDate.toLocaleDateString()
                          : 'TBD'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-1">Guests</p>
                      <p className="text-gray-900 font-semibold">{booking.numberOfGuests || 1}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-1">Total</p>
                      <p className="text-gray-900 text-xl font-bold">
                        {formatCurrency(booking.netAmount || booking.totalPrice)}
                      </p>
                      {booking.discountAmount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Saved {formatCurrency(booking.discountAmount)} {booking.couponCode ? `with ${booking.couponCode}` : 'via coupon'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs md:text-sm text-gray-600">
                    <span className="px-3 py-1 rounded-full bg-gray-100">
                      Transaction: {booking.transactionId || 'processing'}
                    </span>
                    {booking.paymentReference && (
                      <span className="px-3 py-1 rounded-full bg-gray-100">
                        Capture: {booking.paymentReference}
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-gray-100">
                      Status: {booking.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


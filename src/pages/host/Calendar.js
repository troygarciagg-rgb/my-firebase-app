import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getListings, getBookings } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function Calendar() {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      const [listingsData, bookingsData] = await Promise.all([
        getListings({ hostId: currentUser.uid }),
        getBookings({ hostId: currentUser.uid })
      ]);

      setListings(listingsData);
      setBookings(bookingsData);
      if (listingsData.length > 0) {
        setSelectedListing(listingsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateBooked = (date) => {
    if (!selectedListing) return false;
    const dateStr = date.toISOString().split('T')[0];
    return bookings.some(booking => {
      if (booking.listingId !== selectedListing) return false;
      const checkIn = booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
      const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];
      return dateStr >= checkInStr && dateStr < checkOutStr;
    });
  };

  const isDateBlocked = (date) => {
    if (!selectedListing) return false;
    const listing = listings.find(l => l.id === selectedListing);
    if (!listing || !listing.blockedDates) return false;
    const dateStr = date.toISOString().split('T')[0];
    return listing.blockedDates.includes(dateStr);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="host" />
          <div className="flex-1 p-8 bg-gray-50 min-h-screen">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading calendar...</p>
            </div>
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
        <div className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Calendar</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h2>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {days.map((date, index) => {
                      if (!date) {
                        return <div key={index} className="aspect-square"></div>;
                      }
                      const isToday = date.toDateString() === new Date().toDateString();
                      const booked = isDateBooked(date);
                      const blocked = isDateBlocked(date);
                      
                      return (
                        <div
                          key={index}
                          className={`aspect-square p-2 rounded-lg border-2 flex flex-col items-center justify-center text-sm font-medium transition-all ${
                            isToday
                              ? 'border-blue-600 bg-blue-50 text-blue-900'
                              : booked
                              ? 'border-violet-500 bg-violet-50 text-violet-900'
                              : blocked
                              ? 'border-red-500 bg-red-50 text-red-900'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          <span>{date.getDate()}</span>
                          {(booked || blocked) && (
                            <span className="text-xs mt-1">
                              {booked ? '📅' : '🚫'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 bg-blue-50 rounded"></div>
                      <span>Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-violet-500 bg-violet-50 rounded"></div>
                      <span>Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-red-500 bg-red-50 rounded"></div>
                      <span>Blocked</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Listing</h3>
                  <select
                    value={selectedListing || ''}
                    onChange={(e) => setSelectedListing(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {listings.map(listing => (
                      <option key={listing.id} value={listing.id}>
                        {listing.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bookings</h3>
                  {bookings
                    .filter(b => b.listingId === selectedListing && b.status === 'accepted')
                    .slice(0, 5)
                    .map(booking => (
                      <div key={booking.id} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                        <p className="font-medium text-gray-900">{booking.guestEmail || 'Guest'}</p>
                        <p className="text-sm text-gray-600">
                          {booking.checkIn?.toDate ? booking.checkIn.toDate().toLocaleDateString() : 'N/A'} - 
                          {booking.checkOut?.toDate ? booking.checkOut.toDate().toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    ))}
                  {bookings.filter(b => b.listingId === selectedListing && b.status === 'accepted').length === 0 && (
                    <p className="text-gray-500 text-sm">No upcoming bookings</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


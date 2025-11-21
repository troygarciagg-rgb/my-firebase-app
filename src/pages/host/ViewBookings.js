import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBookings, acceptBooking, declineBooking } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function ViewBookings() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, [currentUser]);

  const loadBookings = async () => {
    if (!currentUser) return;
    
    try {
      const data = await getBookings({ hostId: currentUser.uid });
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId) => {
    try {
      await acceptBooking(bookingId);
      loadBookings();
    } catch (error) {
      console.error('Error accepting booking:', error);
      alert('Failed to accept booking');
    }
  };

  const handleDecline = async (bookingId) => {
    if (window.confirm('Are you sure you want to decline this booking?')) {
      try {
        await declineBooking(bookingId);
        loadBookings();
      } catch (error) {
        console.error('Error declining booking:', error);
        alert('Failed to decline booking');
      }
    }
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

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
        <div className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Bookings</h1>

          <div className="mb-4 flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 rounded ${filter === 'accepted' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Accepted
            </button>
            <button
              onClick={() => setFilter('declined')}
              className={`px-4 py-2 rounded ${filter === 'declined' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Declined
            </button>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.listingTitle || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.guestEmail || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.checkIn?.toDate?.().toLocaleDateString() || booking.checkIn || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.checkOut?.toDate?.().toLocaleDateString() || booking.checkOut || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.numberOfGuests || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${booking.totalPrice || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            booking.status === 'declined' ? 'bg-red-100 text-red-800' :
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {booking.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAccept(booking.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDecline(booking.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


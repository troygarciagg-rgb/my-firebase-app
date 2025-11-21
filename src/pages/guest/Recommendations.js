import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getListings, getBookings } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function Recommendations() {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [currentUser]);

  const loadRecommendations = async () => {
    if (!currentUser) return;
    
    try {
      // Get user's previous bookings
      const bookings = await getBookings({ guestId: currentUser.uid });
      
      // Get all published listings
      const publishedListings = await getListings({ status: 'published' });
      
      // Simple recommendation algorithm: show listings from same category or location
      const bookedCategories = new Set();
      const bookedLocations = new Set();
      
      bookings.forEach(booking => {
        const listing = publishedListings.find(l => l.id === booking.listingId);
        if (listing) {
          if (listing.category) bookedCategories.add(listing.category);
          if (listing.location?.city) bookedLocations.add(listing.location.city);
        }
      });
      
      // Recommend listings from same category or location
      const recommended = publishedListings
        .filter(l => {
          // Don't recommend listings user already booked
          const alreadyBooked = bookings.some(b => b.listingId === l.id);
          if (alreadyBooked) return false;
          
          // Recommend if same category or location
          const sameCategory = l.category && bookedCategories.has(l.category);
          const sameLocation = l.location?.city && bookedLocations.has(l.location.city);
          
          return sameCategory || sameLocation;
        })
        .slice(0, 6); // Limit to 6 recommendations
      
      setRecommendations(recommended);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (listing) => {
    if (listing.imageURLs && listing.imageURLs.length > 0) return listing.imageURLs[0];
    if (listing.image) return listing.image;
    if (listing.photos && listing.photos.length > 0) return listing.photos[0];
    return null;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="guest" />
          <div className="flex-1 p-8 bg-gray-50 min-h-screen">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading recommendations...</p>
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
        <Sidebar role="guest" />
        <div className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Recommended for You</h1>
            <p className="text-gray-600 mb-6">Based on your previous bookings and preferences</p>

            {recommendations.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations yet</h3>
                <p className="text-gray-600">Start booking listings to get personalized recommendations!</p>
                <Link
                  to="/guest/browse"
                  className="inline-block mt-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg font-medium"
                >
                  Browse Listings
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((listing) => {
                  const imageSrc = getImageSrc(listing);
                  return (
                    <Link
                      key={listing.id}
                      to={`/guest/listing/${listing.id}`}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                    >
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center">
                          <span className="text-white text-4xl">🏠</span>
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">{listing.title || 'Untitled'}</h3>
                        <p className="text-gray-600 text-sm mb-2">{listing.category || 'Uncategorized'}</p>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{listing.description || 'No description'}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-blue-600">${listing.price || 0}/night</span>
                          {listing.discount > 0 && (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                              {listing.discount}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


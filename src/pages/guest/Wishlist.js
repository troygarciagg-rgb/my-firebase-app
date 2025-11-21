import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getWishlist, getListing, removeFromWishlist } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function Wishlist() {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, [currentUser]);

  const loadWishlist = async () => {
    if (!currentUser) return;
    
    try {
      const wishlistIds = await getWishlist(currentUser.uid);
      const listingsData = await Promise.all(
        wishlistIds.map(id => getListing(id))
      );
      setListings(listingsData.filter(l => l !== null));
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (listingId) => {
    try {
      await removeFromWishlist(currentUser.uid, listingId);
      setListings(listings.filter(l => l.id !== listingId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="guest" />
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
        <Sidebar role="guest" />
        <div className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>

          {listings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">Your wishlist is empty</p>
              <Link
                to="/guest/browse"
                className="text-blue-600 hover:text-blue-800"
              >
                Browse listings
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {listing.photos && listing.photos.length > 0 && (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold">{listing.title}</h3>
                      <button
                        onClick={() => handleRemove(listing.id)}
                        className="text-red-500 text-2xl"
                      >
                        ❤️
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{listing.category}</p>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{listing.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">${listing.price}/night</span>
                      <Link
                        to={`/guest/listing/${listing.id}`}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        View Details
                      </Link>
                    </div>
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


import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { getFavorites, getListing, removeFavorite } from '../../utils/firebaseFunctions';

function FavoriteCard({ listing, onRemove }) {
  if (!listing) return null;
  const image =
    listing.image ||
    (listing.imageURLs && listing.imageURLs[0]) ||
    (listing.photos && listing.photos[0]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {image ? (
        <img src={image} alt={listing.title} className="h-48 w-full object-cover" />
      ) : (
        <div className="h-48 w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl">
          🏡
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{listing.title}</h3>
          <button
            onClick={onRemove}
            className="text-red-500 text-xl hover:scale-110 transition"
            title="Remove from favorites"
          >
            ♥
          </button>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">
          {listing.location?.city && listing.location?.country
            ? `${listing.location.city}, ${listing.location.country}`
            : listing.location?.city || listing.location?.country || 'Location not specified'}
        </p>
        <p className="text-sm text-gray-600 flex-1 line-clamp-3">
          {listing.description || 'No description provided.'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-600">
            ${Number(listing.price || 0).toFixed(2)}
          </span>
          <Link
            to={`/guest/listing/${listing.id}`}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Favorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError('');
      try {
        const favoriteIds = await getFavorites(currentUser.uid);
        const listingData = await Promise.all(favoriteIds.map((id) => getListing(id)));
        setFavorites(listingData.filter(Boolean));
      } catch (err) {
        console.error('Error loading favorites:', err);
        setError(err.message || 'Failed to load favorites.');
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, [currentUser]);

  const handleRemove = async (listingId) => {
    try {
      await removeFavorite(currentUser.uid, listingId);
      setFavorites((prev) => prev.filter((item) => item.id !== listingId));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const shouldShowSidebar = Boolean(currentUser);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex bg-gray-50 min-h-screen">
          {shouldShowSidebar && <Sidebar role="guest" />}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading favorites...</p>
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
        {shouldShowSidebar && <Sidebar role="guest" />}
        <div className="flex-1 p-6 md:p-10 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-pink-500">Quick saves</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Favorites</h1>
            <p className="text-gray-600 mt-3">
              Tap the heart icon on any listing to add it here. Favorites are your quick shortlist,
              separate from organized wishlists.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          {favorites.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</p>
              <p className="text-gray-500 mb-6">
                Hit the heart on any listing to instantly save it here for later.
              </p>
              <Link
                to="/guest/browse"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-500"
              >
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {favorites.map((listing) => (
                <FavoriteCard
                  key={listing.id}
                  listing={listing}
                  onRemove={() => handleRemove(listing.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


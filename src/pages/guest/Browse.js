import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getListings, getFavorites, addFavorite, removeFavorite } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function Browse() {
  const [searchParams] = useSearchParams();
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    location: '',
    minPrice: '',
    maxPrice: '',
    checkIn: '',
    checkOut: '',
    guests: ''
  });

  useEffect(() => {
    loadListings();
  }, [filters.category]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentUser) {
        setFavoriteIds([]);
        return;
      }
      try {
        const ids = await getFavorites(currentUser.uid);
        setFavoriteIds(ids || []);
      } catch (err) {
        console.warn('[Browse] Failed to load favorites', err);
      }
    };
    loadFavorites();
  }, [currentUser]);

  const cacheListingData = (listing) => {
    try {
      if (!listing?.id) return;
      sessionStorage.setItem(`listingCache_${listing.id}`, JSON.stringify({
        ...listing,
        cachedAt: Date.now()
      }));
    } catch (error) {
      console.warn('[Browse] Failed to cache listing data:', error);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('[Browse] Loading listings with filters:', filters);
      
      const queryFilters = { 
        status: 'published',
        __skipStatusQuery: true,
        __filterPublished: true
      };
      if (filters.category) {
        queryFilters.category = filters.category;
      }
      
      let data = await getListings(queryFilters);

      if (filters.location) {
        const locationFilter = filters.location.toLowerCase();
        data = data.filter(l => {
          const city = l.location?.city?.toLowerCase() || '';
          const country = l.location?.country?.toLowerCase() || '';
          const address = l.location?.address?.toLowerCase() || '';
          return city.includes(locationFilter) || country.includes(locationFilter) || address.includes(locationFilter);
        });
      }
      
      if (filters.minPrice) {
        data = data.filter(l => (l.price || 0) >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        data = data.filter(l => (l.price || 0) <= parseFloat(filters.maxPrice));
      }
      
      if (filters.guests) {
        const guests = parseInt(filters.guests, 10);
        data = data.filter(l => {
          const capacity = l.maxGuests || l.capacity || l.guestCapacity || l.guests || 0;
          return capacity === 0 || capacity >= guests;
        });
      }

      console.log('[Browse] Final filtered listings:', data.length);
      setListings(data);
    } catch (error) {
      console.error('[Browse] Error loading listings:', error);
      console.error('[Browse] Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      if (error.code === 'permission-denied') {
        setError('Cannot retrieve listings at the moment. Please try again later.');
      } else if (error.message?.includes('Firestore index')) {
        setError('Filtering requires a Firestore index. Please follow the console link to create it.');
      } else {
        setError(`Failed to load listings: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    loadListings();
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      checkIn: '',
      checkOut: '',
      guests: ''
    });
  };

  const shouldShowSidebar = currentUser && userRole === 'guest';

  // Get image source - check image, imageURLs, or photos fields
  const getImageSrc = (listing) => {
    if (listing.image) return listing.image; // Base64 string
    if (listing.imageURLs && listing.imageURLs.length > 0) return listing.imageURLs[0]; // Array of base64
    if (listing.photos && listing.photos.length > 0) return listing.photos[0]; // Legacy support
    return null;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="guest" />
          <div className="flex-1 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading listings...</p>
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
        {shouldShowSidebar && <Sidebar role="guest" />}
        <div className={`p-8 bg-gray-50 min-h-screen ${shouldShowSidebar ? 'flex-1' : 'w-full'}`}>
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 text-white rounded-3xl shadow-lg shadow-blue-900/10 p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Guest explorer</p>
              <h1 className="text-3xl font-bold mt-2">Browse Listings</h1>
              <p className="text-white/85 mt-2 max-w-3xl">
                Discover curated homes, hotels, and experiences across the globe. Use advanced filters to narrow down the perfect stay.
              </p>
              <div className="flex flex-wrap gap-3 mt-6 text-sm">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Verified hosts</span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Secure payments</span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">Instant availability</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
                <p className="font-medium">{error}</p>
                <button
                  onClick={loadListings}
                  className="mt-2 text-sm underline hover:text-red-800"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Search filters</h2>
                <button onClick={resetFilters} className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Where</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
                  <input
                    type="text"
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    placeholder="City or Country"
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check In</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📅</span>
                  <input
                    type="date"
                    name="checkIn"
                    value={filters.checkIn}
                    onChange={handleFilterChange}
                    min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check Out</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📅</span>
                  <input
                    type="date"
                    name="checkOut"
                    value={filters.checkOut}
                    onChange={handleFilterChange}
                    min={filters.checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">👥</span>
                  <input
                    type="number"
                    name="guests"
                    value={filters.guests}
                    onChange={handleFilterChange}
                    placeholder="Number of guests"
                    min="1"
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">All Categories</option>
                    <option value="Home">Home</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Resort">Resort</option>
                    <option value="Experience">Experience</option>
                    <option value="Service">Service</option>
                    <option value="Event Space">Event Space</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice}
                    onChange={handleFilterChange}
                    placeholder="$0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice}
                    onChange={handleFilterChange}
                    placeholder="$1000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-teal-500 text-white px-8 py-3 rounded-2xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-md font-semibold"
              >
                🔍 Search Listings
              </button>
            </div>

            {listings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No listings found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => {
                  const imageSrc = getImageSrc(listing);
                  const originalPrice = listing.price || 0;
                  const discount = listing.discount || 0;
                  const discountedPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
                  
                  return (
                    <div
                      key={listing.id}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-2xl transition-all duration-200 flex flex-col"
                    >
                      <div className="relative h-52 rounded-3xl overflow-hidden m-3">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={listing.title}
                            className="w-full h-full object-cover"
                          onError={(e) => {
                              e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-4xl">
                            🏡
                        </div>
                      )}
                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                          {listing.category || 'Stay'}
                        </span>
                      </div>
                      <div className="px-5 pb-5 flex-1 flex flex-col gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{listing.title || 'Untitled'}</h3>
                            <span className="text-sm text-gray-500">{listing.rating || '★'}</span>
                        </div>
                          <p className="text-sm text-gray-500">
                          {listing.location?.city && listing.location?.country 
                            ? `${listing.location.city}, ${listing.location.country}`
                            : listing.location?.city || listing.location?.country || 'Location not specified'}
                        </p>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{listing.description || 'No description'}</p>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl px-4 py-3 border border-blue-100">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-600">${discountedPrice.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">/ night</span>
                            {discount > 0 && (
                              <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">{discount}% off</span>
                                )}
                              </div>
                          {discount > 0 && (
                            <p className="text-xs text-gray-500">
                              <span className="line-through mr-1">${originalPrice.toFixed(2)}</span>
                              {listing.promoName || 'Limited offer'}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => {
                              cacheListingData(listing);
                              navigate(`/guest/listing/${listing.id}`, { state: { listingData: listing } });
                            }}
                            className="flex-1 border border-gray-200 rounded-2xl py-2 text-gray-700 font-semibold hover:border-blue-400"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (!currentUser) {
                                navigate('/login', { state: { message: 'Please log in to manage favorites', returnTo: `/guest/browse` } });
                                return;
                              }
                              try {
                                if (favoriteIds.includes(listing.id)) {
                                  await removeFavorite(currentUser.uid, listing.id);
                                  setFavoriteIds((prev) => prev.filter((id) => id !== listing.id));
                                  console.log('[Browse] Removed from favorites:', listing.id);
                                } else {
                                  await addFavorite(currentUser.uid, listing.id);
                                  setFavoriteIds((prev) => [...prev, listing.id]);
                                  console.log('[Browse] Added to favorites:', listing.id);
                                }
                              } catch (err) {
                                console.error('[Browse] Failed to toggle favorite:', err);
                                console.error('[Browse] Error details:', {
                                  code: err.code,
                                  message: err.message,
                                  userId: currentUser.uid,
                                  listingId: listing.id
                                });
                                alert(`Failed to update favorite: ${err.message || 'Unknown error'}`);
                              }
                            }}
                            className={`w-12 flex items-center justify-center rounded-2xl border transition-colors ${
                              favoriteIds.includes(listing.id)
                                ? 'border-red-200 bg-red-50 text-red-500'
                                : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
                            }`}
                            title={favoriteIds.includes(listing.id) ? 'Remove from favorites' : 'Add to favorites'}
                            aria-label={favoriteIds.includes(listing.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favoriteIds.includes(listing.id) ? '❤️' : '🤍'}
                          </button>
                          <button
                            onClick={() => {
                              cacheListingData(listing);
                              if (!currentUser) {
                                navigate('/login', { state: { message: 'Please log in to book a listing', returnTo: `/guest/listing/${listing.id}` } });
                              } else {
                                navigate(`/guest/listing/${listing.id}`, { state: { scrollToBooking: true, listingData: listing } });
                              }
                            }}
                            className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl py-2 font-semibold shadow-md hover:from-green-600 hover:to-teal-600"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
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

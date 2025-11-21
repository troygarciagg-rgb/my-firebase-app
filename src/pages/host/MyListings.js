import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getListings, deleteListing, updateListing } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function MyListings() {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (currentUser) {
      loadListings();
    }
  }, [currentUser]);

  const loadListings = async () => {
    if (!currentUser) {
      console.log('[MyListings] No current user, skipping load');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('[MyListings] Loading listings for hostId:', currentUser.uid);
      const data = await getListings({ hostId: currentUser.uid });
      console.log('[MyListings] Fetched listings:', data);
      console.log('[MyListings] Number of listings:', data.length);
      
      if (data.length === 0) {
        console.warn('[MyListings] No listings found. Checking Firestore...');
      }
      
      setListings(data);
    } catch (error) {
      console.error('[MyListings] Error loading listings:', error);
      console.error('[MyListings] Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setError(`Failed to load listings: ${error.message}`);
      alert(`Error loading listings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (listingId) => {
    if (!window.confirm('Are you sure you want to publish this listing? It will become visible to guests.')) {
      return;
    }

    try {
      await updateListing(listingId, { status: 'published' });
      alert('Listing published successfully!');
      loadListings(); // Reload to update the list
    } catch (error) {
      console.error('Error publishing listing:', error);
      alert('Failed to publish listing: ' + error.message);
    }
  };

  const handleUnpublish = async (listingId) => {
    if (!window.confirm('Are you sure you want to unpublish this listing? It will no longer be visible to guests.')) {
      return;
    }

    try {
      await updateListing(listingId, { status: 'draft' });
      alert('Listing unpublished successfully!');
      loadListings(); // Reload to update the list
    } catch (error) {
      console.error('Error unpublishing listing:', error);
      alert('Failed to unpublish listing: ' + error.message);
    }
  };

  const handleDelete = async (listingId) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteListing(listingId);
        setListings(listings.filter(l => l.id !== listingId));
        alert('Listing deleted successfully');
      } catch (error) {
        console.error('[MyListings] Error deleting listing:', error);
        alert('Failed to delete listing: ' + error.message);
      }
    }
  };

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
          <Sidebar role="host" />
          <div className="flex-1 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your listings...</p>
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
                <p className="text-gray-600 mt-1">Manage your property listings</p>
              </div>
              <Link
                to="/host/add-listing"
                className="bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg font-medium"
              >
                + Add New Listing
              </Link>
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

            {listings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4 text-lg">You haven't created any listings yet.</p>
                <Link
                  to="/host/add-listing"
                  className="inline-block bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg font-medium"
                >
                  Create your first listing
                </Link>
              </div>
            ) : (
              <>
                {/* Filter Tabs */}
                <div className="mb-6 flex gap-4 border-b border-gray-200">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`pb-3 px-4 font-medium transition-colors ${
                      filterStatus === 'all' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    All Listings ({listings.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('published')}
                    className={`pb-3 px-4 font-medium transition-colors ${
                      filterStatus === 'published' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Published ({listings.filter(l => l.status === 'published').length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('draft')}
                    className={`pb-3 px-4 font-medium transition-colors ${
                      filterStatus === 'draft' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Drafts ({listings.filter(l => l.status === 'draft').length})
                  </button>
                </div>
              </>
            )}
            {listings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings
                  .filter(listing => {
                    if (filterStatus === 'all') return true;
                    return listing.status === filterStatus;
                  })
                  .map((listing) => {
                  const imageSrc = getImageSrc(listing);
                  return (
                    <div key={listing.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            console.error('[MyListings] Image load error for listing:', listing.id);
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">{listing.title || 'Untitled'}</h3>
                        <p className="text-gray-600 text-sm mb-2">{listing.category || 'Uncategorized'}</p>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{listing.description || 'No description'}</p>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-2xl font-bold text-blue-600">${listing.price || 0}/night</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            listing.status === 'published' ? 'bg-green-100 text-green-800' :
                            listing.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {listing.status === 'published' ? 'Published' : listing.status || 'draft'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {listing.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(listing.id)}
                              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                            >
                              🚀 Publish
                            </button>
                          )}
                          {listing.status === 'published' && (
                            <button
                              onClick={() => handleUnpublish(listing.id)}
                              className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                            >
                              📝 Unpublish
                            </button>
                          )}
                          <div className="flex space-x-2">
                            <Link
                              to={`/host/edit-listing/${listing.id}`}
                              className="flex-1 bg-blue-500 text-white text-center py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(listing.id)}
                              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                            >
                              Delete
                            </button>
                          </div>
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

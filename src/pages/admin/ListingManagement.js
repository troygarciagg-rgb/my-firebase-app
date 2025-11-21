import { useState, useEffect } from 'react';
import { getListings, approveListing, rejectListing, deleteListing } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function ListingManagement() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const data = await getListings();
      setListings(data);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (listingId) => {
    try {
      await approveListing(listingId);
      loadListings();
    } catch (error) {
      console.error('Error approving listing:', error);
      alert('Failed to approve listing');
    }
  };

  const handleReject = async (listingId) => {
    if (window.confirm('Are you sure you want to reject this listing?')) {
      try {
        await rejectListing(listingId);
        loadListings();
      } catch (error) {
        console.error('Error rejecting listing:', error);
        alert('Failed to reject listing');
      }
    }
  };

  const handleDelete = async (listingId) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteListing(listingId);
        loadListings();
      } catch (error) {
        console.error('Error deleting listing:', error);
        alert('Failed to delete listing');
      }
    }
  };

  const filteredListings = filter === 'all' 
    ? listings 
    : listings.filter(l => l.status === filter);

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
          <h1 className="text-3xl font-bold mb-6">Listing Management</h1>

          <div className="mb-4 flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('published')}
              className={`px-4 py-2 rounded ${filter === 'published' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Published
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded ${filter === 'draft' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Draft
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden">
                {listing.photos && listing.photos.length > 0 && (
                  <img
                    src={listing.photos[0]}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2">{listing.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{listing.category}</p>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{listing.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-blue-600">${listing.price}/night</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      listing.status === 'published' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {listing.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    {listing.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handlePublish(listing.id)}
                          className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                        >
                          Publish
                        </button>
                        <button
                          onClick={() => handleReject(listing.id)}
                          className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                        >
                          Keep as Draft
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredListings.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No listings found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getListing, updateListing } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

// Convert file to base64
const toBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export default function EditListing() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Home',
    price: '',
    discount: '',
    promoName: '',
    promoDetails: '',
    amenities: [],
    blockedDates: [],
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      coordinates: { lat: '', lng: '' }
    }
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [base64Images, setBase64Images] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [error, setError] = useState('');

  const categories = ['Home', 'Hotel', 'Resort', 'Experience', 'Service', 'Event Space'];

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    if (!id) {
      setError('No listing ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('[EditListing] Loading listing:', id);
      
      const listing = await getListing(id);
      console.log('[EditListing] Loaded listing:', listing);
      
      if (!listing) {
        setError('Listing not found');
        setLoading(false);
        return;
      }

      // Check if user owns this listing
      if (listing.hostId !== currentUser?.uid) {
        setError('You do not have permission to edit this listing');
        setLoading(false);
        navigate('/host/my-listings');
        return;
      }

      // Populate form with existing data
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        category: listing.category || 'Home',
        price: listing.price || '',
        discount: listing.discount || '',
        promoName: listing.promoName || '',
        promoDetails: listing.promoDetails || '',
        amenities: listing.amenities || [],
        blockedDates: listing.blockedDates || [],
        location: listing.location || {
          address: '',
          city: '',
          state: '',
          country: '',
          coordinates: { lat: '', lng: '' }
        }
      });

      // Load existing images
      if (listing.image) {
        setBase64Images([listing.image]);
        setImagePreviews([listing.image]);
      } else if (listing.imageURLs && listing.imageURLs.length > 0) {
        setBase64Images(listing.imageURLs);
        setImagePreviews(listing.imageURLs);
      } else if (listing.photos && listing.photos.length > 0) {
        setBase64Images(listing.photos);
        setImagePreviews(listing.photos);
      }

    } catch (error) {
      console.error('[EditListing] Error loading listing:', error);
      setError('Failed to load listing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const validFiles = files.filter(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const isValidType = 
        file.type === 'image/jpeg' || 
        file.type === 'image/jpg' || 
        file.type === 'image/png' ||
        fileExtension === 'jpg' ||
        fileExtension === 'jpeg' ||
        fileExtension === 'png';
      
      if (!isValidType) {
        alert(`${file.name} is not a valid image file. Please upload JPG, JPEG, or PNG files only.`);
        return false;
      }
      return true;
    });

    // Validate file size
    const sizeValidFiles = validFiles.filter(file => {
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      if (!isValidSize) {
        alert(`${file.name} is too large. Maximum file size is 5MB.`);
        return false;
      }
      return true;
    });

    if (sizeValidFiles.length === 0) return;

    // Convert files to base64
    const newPreviews = [];
    const newBase64Images = [];

    for (const file of sizeValidFiles) {
      try {
        const base64 = await toBase64(file);
        newPreviews.push(base64);
        newBase64Images.push(base64);
      } catch (error) {
        console.error('Error converting file to base64:', error);
        alert(`Failed to process ${file.name}. Please try again.`);
      }
    }

    setSelectedFiles(prev => [...prev, ...sizeValidFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setBase64Images(prev => [...prev, ...newBase64Images]);
  };

  const handleRemovePhoto = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setBase64Images(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()]
      }));
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (index) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const handleAddBlockedDate = () => {
    if (selectedDate && !formData.blockedDates.includes(selectedDate)) {
      setFormData(prev => ({
        ...prev,
        blockedDates: [...prev.blockedDates, selectedDate]
      }));
      setSelectedDate('');
    }
  };

  const handleRemoveBlockedDate = (date) => {
    setFormData(prev => ({
      ...prev,
      blockedDates: prev.blockedDates.filter(d => d !== date)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (saving) return;

    if (base64Images.length === 0) {
      alert('Please select at least one image for your listing.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        promoName: formData.promoName.trim() || '',
        promoDetails: formData.promoDetails.trim() || '',
        amenities: formData.amenities || [],
        blockedDates: formData.blockedDates || [],
        image: base64Images[0], // Store first image as base64 string
        imageURLs: base64Images, // Store all images as array
        location: {
          address: formData.location.address?.trim() || '',
          city: formData.location.city?.trim() || '',
          state: formData.location.state?.trim() || '',
          country: formData.location.country?.trim() || '',
          coordinates: {
            lat: formData.location.coordinates?.lat || '',
            lng: formData.location.coordinates?.lng || ''
          }
        }
      };

      console.log('[EditListing] Updating listing:', id, updateData);
      await updateListing(id, updateData);
      console.log('[EditListing] Listing updated successfully');
      
      alert('Listing updated successfully!');
      navigate('/host/my-listings');
    } catch (error) {
      console.error('[EditListing] Error updating listing:', error);
      setError('Failed to update listing: ' + error.message);
      alert('Failed to update listing: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          <Sidebar role="host" />
          <div className="flex-1 p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading listing...</p>
              </div>
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
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Edit Listing</h1>
            <p className="text-gray-600 mb-6">Update your property listing information</p>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Beautiful beachfront villa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows="5"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Describe your property in detail..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Night ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount (%)
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    <input
                      type="number"
                      name="discount"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.discount}
                      onChange={handleChange}
                      className="w-full pr-8 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promo Name
                  </label>
                  <input
                    type="text"
                    name="promoName"
                    value={formData.promoName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Summer Special"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promo Details
                  </label>
                  <input
                    type="text"
                    name="promoDetails"
                    value={formData.promoDetails}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Promotion description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Photo *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-400 transition-colors bg-gray-50">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload-edit"
                  />
                  <label
                    htmlFor="file-upload-edit"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-base font-semibold text-gray-700 mb-1">Click to upload or change image</span>
                    <span className="text-sm text-gray-500">JPG, JPEG, or PNG (Max 5MB)</span>
                  </label>
                </div>
                
                {imagePreviews.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Current Image{imagePreviews.length > 1 ? 's' : ''} ({imagePreviews.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg transform hover:scale-110"
                            title="Remove image"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Location Details
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      name="location.address"
                      value={formData.location.address}
                      onChange={handleChange}
                      placeholder="Street Address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    name="location.city"
                    value={formData.location.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <input
                    type="text"
                    name="location.state"
                    value={formData.location.state}
                    onChange={handleChange}
                    placeholder="State/Province"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <input
                    type="text"
                    name="location.country"
                    value={formData.location.country}
                    onChange={handleChange}
                    placeholder="Country"
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Amenities
                </label>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="text"
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAmenity())}
                    placeholder="Add amenity (e.g., WiFi, Pool, Parking)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddAmenity}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-md font-medium"
                  >
                    + Add Amenity
                  </button>
                </div>
                {formData.amenities.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {formData.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-md"
                        >
                          <span>{amenity}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAmenity(index)}
                            className="hover:bg-white hover:bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                            title="Remove amenity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Blocked Dates (Calendar Availability)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddBlockedDate}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all transform hover:scale-105 shadow-md font-medium"
                  >
                    + Block Date
                  </button>
                </div>
                {formData.blockedDates.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-3">
                      {formData.blockedDates.length} date{formData.blockedDates.length === 1 ? '' : 's'} blocked
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.blockedDates.map((date, index) => (
                        <span
                          key={index}
                          className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                          <span>{new Date(date).toLocaleDateString()}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlockedDate(date)}
                            className="hover:bg-red-200 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                            title="Remove blocked date"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 italic mt-2">Select dates when your property is not available for booking.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving || imagePreviews.length === 0}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg font-semibold text-lg"
                >
                  {saving ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving Changes...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/host/my-listings')}
                  className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}


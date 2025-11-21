import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getListing,
  getReviews,
  addFavorite,
  removeFavorite,
  getFavorites,
  createBooking,
  checkAvailability,
  getBookings,
  sendHostMessage,
  processBookingPayment,
  getCouponByCode,
  markCouponUsed,
  createCouponForGuest
} from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import ReviewForm from '../../components/ReviewForm';
import PayPalCheckoutButton from '../../components/payments/PayPalCheckoutButton';

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { currentUser, userRole } = useAuth();
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFoundReason, setNotFoundReason] = useState(null);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1
  });
  const [bookingError, setBookingError] = useState('');
  const [checkoutDetails, setCheckoutDetails] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState({ info: '', error: '', success: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactTopic, setContactTopic] = useState('general');
  const [contactBody, setContactBody] = useState('');
  const [contactFeedback, setContactFeedback] = useState({ error: '', success: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [guestReview, setGuestReview] = useState(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [completedStays, setCompletedStays] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState({ error: '', success: '' });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponApplying, setCouponApplying] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [bookingPanelVisible, setBookingPanelVisible] = useState(
    Boolean(routerLocation.state?.scrollToBooking)
  );
  const [datePicker, setDatePicker] = useState({ open: null, month: new Date() });

  const bookedDateSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const blockedDateSet = useMemo(() => new Set(blockedDates), [blockedDates]);

  const formatDateKey = (value) => {
    if (!value) return '';
    const date = new Date(value);
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const humanizeDateKey = (key) => {
    if (!key) return '';
    const date = new Date(`${key}T00:00:00`);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const expandDateRange = (start, end) => {
    if (!start || !end) return [];
    const dates = [];
    const cursor = new Date(start);
    const boundary = new Date(end);
    while (cursor < boundary) {
      dates.push(formatDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  };

  const isBlockingStatus = (status) => {
    const normalized = (status || '').toLowerCase();
    return !['declined', 'cancelled', 'canceled', 'refunded'].includes(normalized);
  };

  const hasRangeConflict = (start, end) => {
    if (!start || !end) return null;
    const cursor = new Date(start);
    const boundary = new Date(end);
    while (cursor < boundary) {
      const key = formatDateKey(cursor);
      if (bookedDateSet.has(key)) {
        return { type: 'booked', dateKey: key, dateLabel: humanizeDateKey(key) };
      }
      if (blockedDateSet.has(key)) {
        return { type: 'blocked', dateKey: key, dateLabel: humanizeDateKey(key) };
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return null;
  };

  const buildMonthDays = (baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  };

  const calendarDays = useMemo(() => buildMonthDays(calendarMonth), [calendarMonth]);
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayKey = formatDateKey(new Date());
  const navigateCalendar = (direction) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };
  const baseTotal = checkoutDetails?.totalPrice || 0;
  const discountAmount = useMemo(() => {
    if (!checkoutDetails || !appliedCoupon) return 0;
    const percent = appliedCoupon.discountPercent || 10;
    return Number((baseTotal * (percent / 100)).toFixed(2));
  }, [checkoutDetails, appliedCoupon, baseTotal]);
  const payableTotal = useMemo(() => {
    if (!checkoutDetails) return 0;
    return Number(Math.max(baseTotal - discountAmount, 0).toFixed(2));
  }, [checkoutDetails, baseTotal, discountAmount]);
  const displayCurrency = listing?.currency || 'USD';
  const formatCurrency = (value = 0) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency
    }).format(value);
  const todayStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const loadAvailability = async (listingRecord) => {
    setAvailabilityLoading(true);
    try {
      const bookingDocs = await getBookings({ listingId: listingRecord.id || id });
      const activeBookings = bookingDocs.filter((booking) => isBlockingStatus(booking.status));
      const dateSet = new Set();
      activeBookings.forEach((booking) => {
        const start = booking.checkIn?.toDate ? booking.checkIn.toDate() : (booking.checkIn ? new Date(booking.checkIn) : null);
        const end = booking.checkOut?.toDate ? booking.checkOut.toDate() : (booking.checkOut ? new Date(booking.checkOut) : null);
        expandDateRange(start, end).forEach((day) => dateSet.add(day));
      });
      setBookedDates(Array.from(dateSet));
    } catch (error) {
      console.error('[ListingDetails] Failed to load availability calendar:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const toggleDatePicker = (field) => {
    setDatePicker((prev) => ({
      open: prev.open === field ? null : field,
      month:
        prev.open === field
          ? prev.month
          : bookingData[field]
          ? new Date(bookingData[field])
          : new Date()
    }));
  };

  const navigatePickerMonth = (direction) => {
    setDatePicker((prev) => ({
      ...prev,
      month: new Date(prev.month.getFullYear(), prev.month.getMonth() + direction, 1)
    }));
  };

  const isSelectableDate = (field, dateObj) => {
    if (!dateObj) return false;
    const key = formatDateKey(dateObj);
    const dateObjStart = new Date(dateObj);
    dateObjStart.setHours(0, 0, 0, 0);
    
    // Past dates are not selectable
    if (dateObjStart < todayStart) return false;
    
    // Booked or blocked dates are not selectable
    if (bookedDateSet.has(key) || blockedDateSet.has(key)) return false;
    
    // For check-out, must be after check-in
    if (field === 'checkOut' && bookingData.checkIn) {
      const checkInDate = new Date(bookingData.checkIn + 'T00:00:00');
      checkInDate.setHours(0, 0, 0, 0);
      if (dateObjStart <= checkInDate) return false;
    }
    
    return true;
  };

  const handleDateSelected = (field, dateObj) => {
    if (!isSelectableDate(field, dateObj)) return;
    // Use formatDateKey to ensure consistent local date formatting
    const iso = formatDateKey(dateObj);
    setBookingData((prev) => {
      const updated = { ...prev, [field]: iso };
      if (field === 'checkIn' && prev.checkOut) {
        const checkOutDate = new Date(prev.checkOut + 'T00:00:00');
        checkOutDate.setHours(0, 0, 0, 0);
        if (checkOutDate <= dateObj) {
          updated.checkOut = '';
        }
      }
      if (field === 'checkOut' && !prev.checkIn) {
        updated.checkIn = iso;
      }
      return updated;
    });
    setDatePicker((prev) => ({ ...prev, open: null }));
  };

  const renderDatePicker = (field) => {
    if (datePicker.open !== field) return null;
    const pickerDays = buildMonthDays(datePicker.month);
    const monthLabel = datePicker.month.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={(e) => {
            e.stopPropagation();
            setDatePicker((prev) => ({ ...prev, open: null }));
          }}
        />
        {/* Modal Calendar */}
        <div 
          className="date-picker-container fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] rounded-3xl border-2 border-gray-200 bg-white shadow-2xl p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigatePickerMonth(-1);
              }}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 text-xl font-bold"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-xl font-bold text-gray-800">{monthLabel}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigatePickerMonth(1);
              }}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 text-xl font-bold"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 text-center text-sm font-bold text-gray-500 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day} className="py-2">{day}</span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {pickerDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-14" />;
              }
              const key = formatDateKey(date);
              const selectable = isSelectableDate(field, date);
              const isSelected = bookingData[field] && key === bookingData[field];
              const isToday = key === todayKey;
              const isBooked = bookedDateSet.has(key);
              const isBlocked = blockedDateSet.has(key);
              const isPast = date < todayStart;
              
              // Determine styling based on state
              let classes = 'h-14 flex items-center justify-center rounded-xl text-base font-semibold transition-all relative';
              
              if (isSelected) {
                classes += ' bg-blue-600 text-white shadow-lg border-2 border-blue-700 scale-105';
              } else if (isBooked) {
                classes += ' bg-red-100 text-red-600 border-2 border-red-300 cursor-not-allowed opacity-75';
              } else if (isBlocked) {
                classes += ' bg-gray-200 text-gray-500 border-2 border-gray-300 cursor-not-allowed opacity-60';
              } else if (isPast) {
                classes += ' bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50';
              } else if (isToday) {
                classes += ' bg-blue-50 text-blue-700 border-2 border-blue-300 cursor-pointer hover:bg-blue-100 hover:border-blue-400';
              } else {
                classes += ' bg-white text-gray-700 border border-gray-200 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 active:scale-95';
              }

              return (
                <button
                  key={`${key}-${index}`}
                  type="button"
                  disabled={!selectable}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectable) {
                      handleDateSelected(field, date);
                    }
                  }}
                  className={classes}
                  title={
                    isBooked 
                      ? `Booked - ${date.toLocaleDateString()}`
                      : isBlocked
                      ? `Blocked - ${date.toLocaleDateString()}`
                      : isPast
                      ? `Past date - ${date.toLocaleDateString()}`
                      : selectable
                      ? `Select ${date.toLocaleDateString()}`
                      : 'Date not available'
                  }
                >
                  {date.getDate()}
                  {isBooked && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="Booked" />
                  )}
                  {isBlocked && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-gray-500 rounded-full" title="Blocked" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-3 border-t border-gray-200 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-600">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-gray-600">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded"></div>
              <span className="text-gray-600">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span className="text-gray-600">Today</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDatePicker((prev) => ({ ...prev, open: null }));
              }}
              className="px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium"
            >
              Close
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const base = field === 'checkOut' && bookingData.checkIn
                  ? new Date(bookingData.checkIn + 'T00:00:00')
                  : new Date();
                base.setHours(0, 0, 0, 0);
                setDatePicker((prev) => ({ ...prev, month: new Date(base.getFullYear(), base.getMonth(), 1) }));
              }}
              className="px-4 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors text-gray-700 font-medium"
            >
              Go to Today
            </button>
          </div>
        </div>
      </>
    );
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser, userRole]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePicker.open && !event.target.closest('.date-picker-container')) {
        setDatePicker((prev) => ({ ...prev, open: null }));
      }
    };

    if (datePicker.open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [datePicker.open]);

  const getCachedListing = () => {
    try {
      const cached = sessionStorage.getItem(`listingCache_${id}`);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      return parsed;
    } catch (error) {
      console.warn('[ListingDetails] Failed to parse cached listing data:', error);
      return null;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setNotFoundReason(null);
      console.log('[ListingDetails] Loading listing with ID:', id);
      
      let listingData = await getListing(id);
      console.log('[ListingDetails] Listing data received:', listingData);

      if (!listingData && routerLocation.state?.listingData) {
        console.log('[ListingDetails] Using fallback listing data from navigation state');
        listingData = {
          ...routerLocation.state.listingData,
          status: routerLocation.state.listingData.status || 'published'
        };
      }

      if (!listingData) {
        const cachedListing = getCachedListing();
        if (cachedListing) {
          console.log('[ListingDetails] Using cached listing data');
          listingData = {
            ...cachedListing,
            status: cachedListing.status || 'published'
          };
        }
      }
      
      if (!listingData) {
        console.error('[ListingDetails] Listing not found for ID:', id);
        console.error('[ListingDetails] This could mean:');
        console.error('  1. The listing does not exist in Firestore');
        console.error('  2. Firestore rules are blocking read access');
        console.error('  3. The listing ID is incorrect');
        console.error('  4. The listing might be in a different collection');
        setListing(null);
        setNotFoundReason('missing');
        setAvailabilityLoading(false);
        setBookedDates([]);
        setBlockedDates([]);
        setLoading(false);
        return;
      }

      let reviewsData = [];
      try {
        reviewsData = await getReviews(id);
      } catch (reviewError) {
        console.error('[ListingDetails] Failed to load reviews:', reviewError);
        if (reviewError.code === 'failed-precondition') {
          console.warn('[ListingDetails] Reviews query requires a Firestore index. Showing listing without reviews.');
        } else {
          console.warn('[ListingDetails] Reviews will be hidden due to error:', reviewError.message);
        }
      }

      setListing(listingData);
      setReviews(reviewsData);
      setBlockedDates(listingData.blockedDates || []);
      await loadAvailability(listingData);

      if (currentUser && userRole === 'guest') {
        try {
          const completed = await getBookings({
            guestId: currentUser.uid,
            listingId: id,
            status: 'completed'
          });
          setCompletedStays(completed.length);
          setCanReview(completed.length > 0);
        } catch (error) {
          console.error('[ListingDetails] Failed to verify booking history:', error);
          setCanReview(false);
        }
      } else {
        setCanReview(false);
      }

      if (currentUser) {
        const favoriteIds = await getFavorites(currentUser.uid);
        setIsFavorite(favoriteIds.includes(id));
        const existingReview = reviewsData.find((review) => review.guestId === currentUser.uid);
        setGuestReview(existingReview || null);
        setIsEditingReview(false);
      } else {
        setGuestReview(null);
      }

      // Scroll to booking form if coming from Book button
      if (routerLocation.state?.scrollToBooking) {
        setBookingPanelVisible(true);
        setTimeout(() => {
          const bookingForm = document.getElementById('booking-form');
          if (bookingForm) {
            bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
    } catch (error) {
      console.error('[ListingDetails] Error loading data:', error);
      console.error('[ListingDetails] Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setListing(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAdded = () => {
    loadData();
  };

  const handleFavoriteToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      navigate('/login', { state: { message: 'Please log in to add favorites', returnTo: `/guest/listing/${id}` } });
      return;
    }

    try {
      if (isFavorite) {
        await removeFavorite(currentUser.uid, id);
        setIsFavorite(false);
        console.log('[Favorites] Removed from favorites:', id);
      } else {
        await addFavorite(currentUser.uid, id);
        setIsFavorite(true);
        console.log('[Favorites] Added to favorites:', id);
      }
    } catch (error) {
      console.error('[Favorites] Error updating favorite:', error);
      console.error('[Favorites] Error details:', {
        code: error.code,
        message: error.message,
        userId: currentUser.uid,
        listingId: id
      });
      // Show user-friendly error
      alert(`Failed to update favorite: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCouponApply = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!checkoutDetails) {
      setCouponFeedback({ error: 'Select dates and guests before applying a coupon.', success: '' });
      return;
    }
    const trimmedCode = couponCode.trim().toUpperCase();
    if (!trimmedCode) {
      setCouponFeedback({ error: 'Enter a coupon code to apply.', success: '' });
      return;
    }

    setCouponApplying(true);
    setCouponFeedback({ error: '', success: '' });
    try {
      const coupon = await getCouponByCode(trimmedCode);
      if (!coupon) {
        throw new Error('Coupon not found.');
      }
      if (coupon.guestId !== currentUser.uid) {
        throw new Error('This coupon does not belong to your account.');
      }
      if (coupon.isUsed) {
        throw new Error('This coupon has already been used.');
      }
      const expiresAt = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : coupon.expiresAt ? new Date(coupon.expiresAt) : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        throw new Error('This coupon has expired.');
      }

      setAppliedCoupon({
        code: coupon.id,
        discountPercent: coupon.discountPercent || 10,
        expiresAt: coupon.expiresAt
      });
      setCouponFeedback({ error: '', success: `Coupon applied! ${coupon.discountPercent || 10}% discount will be applied.` });
    } catch (error) {
      setAppliedCoupon(null);
      setCouponFeedback({ error: error.message || 'Unable to apply coupon.', success: '' });
    } finally {
      setCouponApplying(false);
    }
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponFeedback({ error: '', success: '' });
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingError('');
    setPaymentStatus({ info: '', error: '', success: '' });
    setCheckoutDetails(null);
    console.log('[Booking] handleBooking triggered', bookingData);

    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      const conflict = hasRangeConflict(bookingData.checkIn, bookingData.checkOut);
      if (conflict) {
        setBookingError(
          `The date ${conflict.dateLabel} is already ${
            conflict.type === 'booked' ? 'booked by another guest' : 'blocked by the host'
          }. Please choose a different range.`
        );
        return;
      }

      const available = await checkAvailability(id, bookingData.checkIn, bookingData.checkOut);
      if (!available) {
        setBookingError('These dates are not available');
        return;
      }

      const checkInDate = new Date(bookingData.checkIn);
      const checkOutDate = new Date(bookingData.checkOut);
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      if (!nights || nights <= 0) {
        setBookingError('Please select valid check-in and check-out dates.');
        return;
      }

      const discount = listing.discount || 0;
      const basePrice = listing.price;
      const discountedPricePerNight = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
      const totalPrice = Number((nights * discountedPricePerNight).toFixed(2));

      setCheckoutDetails({
        totalPrice,
        nights,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        numberOfGuests: bookingData.numberOfGuests
      });
      console.log('[Booking] Checkout details prepared', {
        totalPrice,
        nights
      });
      setPaymentStatus({
        info: 'Dates reserved. Complete the PayPal payment below to confirm your stay.',
        error: '',
        success: ''
      });
    } catch (error) {
      console.error('Error preparing booking:', error);
      setBookingError('Failed to prepare booking: ' + error.message);
    }
  };

  const openContactHost = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setContactFeedback({ error: '', success: '' });
    setContactBody('');
    setContactTopic('general');
    setContactModalOpen(true);
  };

  const handleSendHostMessage = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!contactBody.trim()) {
      setContactFeedback({ error: 'Please include a message for the host.', success: '' });
      return;
    }
    setContactLoading(true);
    setContactFeedback({ error: '', success: '' });
    try {
      await sendHostMessage({
        listingId: id,
        listingTitle: listing.title,
        hostId: listing.hostId,
        hostName: listing.hostName || '',
        guestId: currentUser.uid,
        guestEmail: currentUser.email,
        topic: contactTopic,
        message: contactBody.trim()
      });
      setContactFeedback({ error: '', success: 'Message sent! The host will get back to you soon.' });
      setContactBody('');
      setTimeout(() => setContactModalOpen(false), 1500);
    } catch (error) {
      setContactFeedback({ error: error.message || 'Failed to send message.', success: '' });
    } finally {
      setContactLoading(false);
    }
  };

  const handlePaymentApproval = async ({ orderID }) => {
    if (!checkoutDetails || !listing || !currentUser) return;
    setPaymentLoading(true);
    setPaymentStatus({ info: 'Processing payment...', error: '', success: '' });
    console.log('[Payments] onApprove handler started', {
      orderID,
      checkoutDetails
    });

    try {
      const idToken = await currentUser.getIdToken();
      const amountToCharge = payableTotal > 0 ? payableTotal : checkoutDetails.totalPrice;
      console.log('[Payments] Calling processBookingPayment with:', {
        orderId: orderID,
        listingId: id,
        listingTitle: listing.title,
        hostId: listing.hostId,
        totalAmount: amountToCharge
      });
      
      const paymentResult = await processBookingPayment({
        orderId: orderID,
        listingId: id,
        listingTitle: listing.title,
        hostId: listing.hostId,
        totalAmount: amountToCharge,
        couponCode: appliedCoupon?.code || null,
        discountAmount
      }, idToken);
      
      console.log('[Payments] Payment result received:', {
        status: paymentResult.status,
        payoutStatus: paymentResult.payoutStatus,
        adminFee: paymentResult.adminFee,
        hostPayout: paymentResult.hostPayout,
        payoutWarning: paymentResult.payoutWarning,
        payoutError: paymentResult.payoutError,
        payoutBatchId: paymentResult.payoutBatchId
      });
      
      // Show warning/error if payout had issues
      if (paymentResult.payoutWarning) {
        setPaymentStatus({
          info: '',
          error: `⚠️ Payment successful, but payout pending: ${paymentResult.payoutWarning}`,
          success: ''
        });
      }
      if (paymentResult.payoutError) {
        setPaymentStatus({
          info: '',
          error: `❌ Payment successful, but payout failed: ${paymentResult.payoutError}. Please contact support.`,
          success: ''
        });
      }

      const bookingId = await createBooking({
        listingId: id,
        listingTitle: listing.title,
        hostId: listing.hostId,
        guestId: currentUser.uid,
        guestEmail: currentUser.email,
        checkIn: checkoutDetails.checkIn,
        checkOut: checkoutDetails.checkOut,
        numberOfGuests: checkoutDetails.numberOfGuests,
        totalPrice: checkoutDetails.totalPrice,
        netAmount: amountToCharge,
        discountAmount,
        couponCode: appliedCoupon?.code || null,
        couponDiscountPercent: appliedCoupon?.discountPercent || null,
        adminFee: paymentResult.adminFee,
        hostPayout: paymentResult.hostPayout,
        payoutStatus: paymentResult.payoutStatus,
        status: 'paid',
        transactionId: paymentResult.transactionId,
        paymentReference: paymentResult.captureId
      });

      if (appliedCoupon) {
        await markCouponUsed(appliedCoupon.code, bookingId);
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponFeedback({ error: '', success: '' });
      }

      try {
        await createCouponForGuest(currentUser.uid);
      } catch (couponError) {
        console.warn('[Coupons] Unable to generate new coupon:', couponError);
      }

      await loadAvailability({ ...(listing || {}), id });

      setCheckoutDetails(null);
      
      // Build comprehensive success message
      let successMsg = 'Payment completed! Your booking has been confirmed.';
      if (paymentResult.payoutStatus === 'SENT' || paymentResult.payoutStatus === 'SUCCESS') {
        successMsg += ` Host payout ($${paymentResult.hostPayout?.toFixed(2) || 'N/A'}) has been sent.`;
      } else if (paymentResult.payoutStatus === 'payoutPending' || paymentResult.payoutStatus === 'PENDING') {
        successMsg += ` Note: Host payout is pending.`;
      }
      successMsg += ' A new loyalty coupon has been added to your account.';
      
      setPaymentStatus({
        success: successMsg,
        error: paymentResult.payoutError ? `⚠️ Payout issue: ${paymentResult.payoutError}` : '',
        info: ''
      });
      console.log('[Payments] Payment succeeded, redirecting to bookings');
      setTimeout(() => navigate('/guest/my-bookings'), 2000);
    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentStatus({
        error: error.message || 'Payment failed. Please try again or contact support.',
        success: '',
        info: ''
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentError = (error) => {
    console.error('PayPal checkout error:', error);
    setPaymentStatus({
      error: (error && error.message) || 'PayPal encountered an issue. Please try again.',
      success: '',
      info: ''
    });
  };

  const shareListing = (platform) => {
    const url = window.location.href;
    const title = listing.title;
    const text = listing.description;

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      return;
    }

    if (platform === 'native' && navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: url
      });
      return;
    }

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      instagram: `https://www.instagram.com/` // Instagram doesn't support direct sharing, but can open app
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const shouldShowSidebar = currentUser && userRole === 'guest';

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex">
          {shouldShowSidebar && <Sidebar role="guest" />}
          <div className={`flex-1 p-8 bg-gray-50 min-h-screen ${shouldShowSidebar ? '' : 'w-full'}`}>
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-10">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
              <p className="text-center text-gray-500 mt-6">Fetching listing details...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!listing) {
    const heading = notFoundReason === 'draft'
      ? 'Listing Not Public Yet'
      : 'Listing Not Found';
    const description = notFoundReason === 'draft'
      ? 'This listing is still in draft mode and can only be viewed by the host.'
      : 'The listing you are looking for does not exist or is no longer available.';

    return (
      <>
        <Navbar />
        <div className="flex">
          {shouldShowSidebar && <Sidebar role="guest" />}
          <div className={`flex-1 p-8 ${shouldShowSidebar ? '' : 'w-full'}`}>
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{heading}</h2>
              <p className="text-gray-600 mb-6">{description}</p>
              {notFoundReason !== 'draft' && (
                <div className="space-y-2 text-sm text-gray-500 mb-6">
                  <p>Possible reasons:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>The listing may have been removed</li>
                    <li>The listing ID may be incorrect</li>
                    <li>The host may have unpublished the listing</li>
                  </ul>
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <Link
                  to="/guest/browse"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg font-medium"
                >
                  Browse Listings
                </Link>
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <>
      <Navbar />
      <div className="flex">
        {shouldShowSidebar && <Sidebar role="guest" />}
        <div className="flex-1 p-8">
          <div className="mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                    <p className="text-gray-600">
                      {listing.location?.city}, {listing.location?.country}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleFavoriteToggle}
                      className={`text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFavorite ? '❤️' : '🤍'}
                    </button>
                    {userRole === 'guest' && (
                      <button
                        onClick={openContactHost}
                        className="border border-gray-200 px-4 py-2 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-2"
                      >
                        <span role="img" aria-label="chat">💬</span> Contact host
                      </button>
                    )}
                    <div className="relative group">
                      <button
                        onClick={() => shareListing('copy')}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Share
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="py-2">
                          <button
                            onClick={() => shareListing('copy')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            📋 Copy Link
                          </button>
                          {navigator.share && (
                            <button
                              onClick={() => shareListing('native')}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            >
                              📱 Share via...
                            </button>
                          )}
                          <button
                            onClick={() => shareListing('facebook')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            📘 Facebook
                          </button>
                          <button
                            onClick={() => shareListing('twitter')}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            🐦 Twitter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Gallery */}
                {(listing.imageURLs && listing.imageURLs.length > 0) || (listing.image) || (listing.photos && listing.photos.length > 0) ? (
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(() => {
                        const images = listing.imageURLs || (listing.image ? [listing.image] : []) || listing.photos || [];
                        return images.slice(0, 4).map((img, index) => (
                          <div key={index} className={`${index === 0 ? 'md:col-span-2' : ''} relative group`}>
                            <img
                              src={img}
                              alt={`${listing.title} ${index + 1}`}
                              className="w-full h-64 md:h-96 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                            {index === 0 && images.length > 4 && (
                              <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                                +{images.length - 4} more
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : null}

                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-4">Description</h2>
                  <p className="text-gray-700">{listing.description}</p>
                </div>

                {listing.amenities && listing.amenities.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-4">Amenities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {listing.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center bg-gray-50 p-3 rounded-lg">
                          <span className="text-green-500 mr-2 text-lg">✓</span>
                          <span className="font-medium">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Map Placeholder */}
                {listing.location && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-4">Location</h2>
                    <div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-600 font-medium">
                        {listing.location.address && `${listing.location.address}, `}
                        {listing.location.city && `${listing.location.city}, `}
                        {listing.location.state && `${listing.location.state}, `}
                        {listing.location.country}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Map integration coming soon</p>
                    </div>
                  </div>
                )}

                {/* Calendar Availability */}
                {listing.blockedDates && listing.blockedDates.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-4">Blocked Dates</h2>
                    <div className="flex flex-wrap gap-2">
                      {listing.blockedDates.slice(0, 10).map((date, index) => (
                        <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                          {new Date(date).toLocaleDateString()}
                        </span>
                      ))}
                      {listing.blockedDates.length > 10 && (
                        <span className="text-gray-500 text-sm">+{listing.blockedDates.length - 10} more</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Reviews</h2>
                      <p className="text-gray-500 text-sm">
                        {reviews.length > 0 ? `${reviews.length} guests shared their experience` : 'No reviews yet'}
                      </p>
                  </div>
                    {userRole === 'guest' && (
                      canReview ? (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          Eligible to review
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                          Complete a stay to review
                        </span>
                      )
                    )}
                  </div>

                  {userRole === 'guest' && (
                    canReview ? (
                      <div className="space-y-4">
                        {guestReview && !isEditingReview && (
                          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-blue-700">Your review</p>
                              <p className="text-yellow-500 text-xl">
                                {'★'.repeat(guestReview.rating)}{'☆'.repeat(5 - guestReview.rating)}
                              </p>
                              <p className="text-gray-700">{guestReview.comment}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {guestReview.createdAt?.toDate?.().toLocaleDateString() || ''}
                              </p>
                            </div>
                            <button
                              onClick={() => setIsEditingReview(true)}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                            >
                              Edit review
                            </button>
                          </div>
                        )}
                        {(!guestReview || isEditingReview) && (
                          <ReviewForm
                            listingId={id}
                            onReviewAdded={handleReviewAdded}
                            mode={guestReview && isEditingReview ? 'edit' : 'create'}
                            reviewId={guestReview?.id}
                            initialRating={guestReview?.rating || 5}
                            initialComment={guestReview?.comment || ''}
                            onCancel={() => setIsEditingReview(false)}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
                        You’ll be able to rate this listing after completing a stay. {completedStays === 0 ? 'No completed bookings yet.' : ''}
                      </div>
                    )
                  )}

                  {reviews.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <span className="text-3xl font-bold mr-2">{averageRating.toFixed(1)}</span>
                        <span className="text-gray-600">({reviews.length} reviews)</span>
                      </div>
                      {reviews.map((review) => (
                        <div key={review.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center mb-2">
                            <span className="font-semibold mr-2">{review.guestName || 'Anonymous'}</span>
                            <span className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {review.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {!bookingPanelVisible && (
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 sticky top-8 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Ready to reserve</p>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">Book this stay</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Click below when you’re ready to choose dates and complete the booking. We’ll hold your selected dates while you finish checkout.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setBookingPanelVisible(true);
                      setTimeout(() => {
                        document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-2xl font-semibold shadow hover:from-green-600 hover:to-teal-600 transition"
                  >
                    Start Booking
                  </button>
                </div>
              )}
              {bookingPanelVisible && (
              <div id="booking-form" className="bg-white rounded-2xl shadow-xl p-6 sticky top-8 border border-gray-100" style={{ overflow: 'visible' }}>
                {/* Price Display with Discount - Prominently Displayed */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  {listing.discount > 0 ? (
                    <div className="space-y-2 p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-3xl font-bold text-green-600">
                          ${(listing.price * (1 - listing.discount / 100)).toFixed(2)}
                        </span>
                        <span className="text-gray-600">/ night</span>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                          {listing.discount}% OFF
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg text-gray-400 line-through">${listing.price.toFixed(2)}/night</span>
                        {listing.promoName && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                            {listing.promoName}
                          </span>
                        )}
                      </div>
                      {listing.promoDetails && (
                        <p className="text-sm text-gray-600 italic mt-1">{listing.promoDetails}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold text-blue-600">${listing.price}</span>
                      <span className="text-gray-600"> / night</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleBooking} className="space-y-4">
                  {bookingError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {bookingError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check In</label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDatePicker('checkIn');
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between font-semibold text-gray-800 bg-white shadow-sm hover:border-blue-300 transition-colors"
                    >
                      <span>{bookingData.checkIn ? new Date(bookingData.checkIn + 'T00:00:00').toLocaleDateString() : 'Select date'}</span>
                      <span className="text-gray-400">📅</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check Out</label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDatePicker('checkOut');
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between font-semibold text-gray-800 bg-white shadow-sm hover:border-blue-300 transition-colors"
                    >
                      <span>{bookingData.checkOut ? new Date(bookingData.checkOut + 'T00:00:00').toLocaleDateString() : 'Select date'}</span>
                      <span className="text-gray-400">📅</span>
                    </button>
                  </div>
                  
                  {/* Render calendar modals at root level */}
                  {renderDatePicker('checkIn')}
                  {renderDatePicker('checkOut')}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bookingData.numberOfGuests}
                      onChange={(e) => setBookingData({ ...bookingData, numberOfGuests: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {bookingError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                      {bookingError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
                  >
                    Review Price &amp; Continue
                  </button>
                </form>

                {paymentStatus.info && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                    {paymentStatus.info}
              </div>
                )}
                {paymentStatus.error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {paymentStatus.error}
            </div>
                )}
                {paymentStatus.success && (
                  <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {paymentStatus.success}
          </div>
                )}

                {checkoutDetails && (
                  <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Stay length</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {checkoutDetails.nights} night{checkoutDetails.nights > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Subtotal</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(baseTotal)}
                        </p>
                      </div>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <span>
                          Coupon discount ({appliedCoupon?.discountPercent || 0}%)
                        </span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-lg font-semibold text-gray-900">
                      <span>Total due</span>
                      <span>{formatCurrency(payableTotal > 0 ? payableTotal : baseTotal)}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Have a coupon?</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="LOYALTY10"
                          disabled={couponApplying || Boolean(appliedCoupon)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        {appliedCoupon ? (
                          <button
                            type="button"
                            onClick={handleCouponRemove}
                            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCouponApply}
                            disabled={couponApplying}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50"
                          >
                            {couponApplying ? 'Checking...' : 'Apply'}
                          </button>
                        )}
                      </div>
                      {couponFeedback.error && (
                        <p className="text-sm text-red-600">{couponFeedback.error}</p>
                      )}
                      {couponFeedback.success && (
                        <p className="text-sm text-green-600">{couponFeedback.success}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Loyalty coupons apply to a single booking. Only one coupon can be used per reservation.
                      </p>
                    </div>

                    <div className="text-sm text-gray-500">
                      Admin fee (5%) is automatically deducted before your host receives payment.
                    </div>
                    <PayPalCheckoutButton
                      amount={payableTotal > 0 ? payableTotal : checkoutDetails.totalPrice}
                      currency={listing?.currency || 'USD'}
                      disabled={paymentLoading || (payableTotal <= 0 && discountAmount >= baseTotal)}
                      onApprove={handlePaymentApproval}
                      onError={handlePaymentError}
                    />
                  </div>
                )}
              </div>
              )}

              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Availability</p>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">Plan your stay</h3>
                    <p className="text-sm text-gray-500">Purple dates are already booked. Red dates are blocked by the host.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigateCalendar(-1)}
                      className="p-2 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
                      aria-label="Previous month"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateCalendar(1)}
                      className="p-2 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
                      aria-label="Next month"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm font-semibold text-gray-800 mb-2">
                  <span>
                    {calendarMonth.toLocaleString('default', { month: 'long' })} {calendarMonth.getFullYear()}
                  </span>
                </div>

                {availabilityLoading ? (
                  <div className="py-10 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    Loading availability...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-gray-500">
                      {weekdayLabels.map((day) => (
                        <span key={day} className="py-1">
                          {day}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {calendarDays.map((date, index) => {
                        if (!date) {
                          return <div key={`blank-${index}`} className="aspect-square" />;
                        }
                        const key = formatDateKey(date);
                        const isBooked = bookedDateSet.has(key);
                        const isBlocked = blockedDateSet.has(key);
                        const isToday = key === todayKey;
                        const baseClasses =
                          'aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-sm font-semibold transition-all';
                        const stateClasses = isBooked
                          ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                          : isBlocked
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : isToday
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50';

                        return (
                          <div key={key} className={`${baseClasses} ${stateClasses}`}>
                            <span>{date.getDate()}</span>
                            {(isBooked || isBlocked || isToday) && (
                              <span className="text-[10px] uppercase tracking-wide mt-1 font-semibold">
                                {isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Today'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-violet-500 bg-violet-100"></span>
                        <span>Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-red-500 bg-red-100"></span>
                        <span>Blocked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100"></span>
                        <span>Today</span>
        </div>
      </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {contactModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Contact host</p>
                <h3 className="text-xl font-bold text-gray-900">{listing?.hostName || 'Host'}</h3>
              </div>
              <button
                onClick={() => setContactModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            {contactFeedback.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                {contactFeedback.error}
              </div>
            )}
            {contactFeedback.success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                {contactFeedback.success}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Topic</label>
              <select
                value={contactTopic}
                onChange={(e) => setContactTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General question</option>
                <option value="pricing">Pricing</option>
                <option value="availability">Availability</option>
                <option value="amenities">Amenities</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
              <textarea
                rows="4"
                value={contactBody}
                onChange={(e) => setContactBody(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ask the host about availability, services, or anything else."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setContactModalOpen(false)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendHostMessage}
                disabled={contactLoading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold hover:from-blue-700 hover:to-teal-600 disabled:opacity-50"
              >
                {contactLoading ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


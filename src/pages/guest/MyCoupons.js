import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { getGuestCoupons } from '../../utils/firebaseFunctions';

function formatDate(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString();
}

function getCouponStatus(coupon) {
  const now = Date.now();
  const expiresAt = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : coupon.expiresAt ? new Date(coupon.expiresAt) : null;

  if (coupon.isUsed) {
    return { label: 'Used', classes: 'bg-gray-100 text-gray-600' };
  }
  if (expiresAt && expiresAt.getTime() < now) {
    return { label: 'Expired', classes: 'bg-red-100 text-red-700' };
  }
  return { label: 'Available', classes: 'bg-green-100 text-green-700' };
}

export default function MyCoupons() {
  const { currentUser } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCoupons = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError('');
      try {
        const data = await getGuestCoupons(currentUser.uid);
        setCoupons(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading coupons', err);
        setError(err.message || 'Failed to load coupons. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadCoupons();
  }, [currentUser]);

  const availableCoupons = useMemo(
    () => coupons.filter((coupon) => !coupon.isUsed),
    [coupons]
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex bg-gray-50 min-h-screen">
          <Sidebar role="guest" />
          <div className="flex-1 p-10 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading coupons...</p>
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
        <Sidebar role="guest" />
        <div className="flex-1 p-6 md:p-10 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-blue-500">Rewards</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">My Coupons</h1>
            <p className="text-gray-600 mt-3">
              Complete a stay to unlock a 10% coupon for your next booking. Each coupon can be used once and applies to your next reservation.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Available</p>
                <p className="text-2xl font-semibold text-gray-900">{availableCoupons.length}</p>
                <p className="text-xs text-gray-500">Coupons ready to use</p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Total earned</p>
                <p className="text-2xl font-semibold text-gray-900">{coupons.length}</p>
                <p className="text-xs text-gray-500">Lifetime coupons</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          {coupons.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-dashed border-gray-300 p-10 text-center">
              <p className="text-xl font-semibold text-gray-900 mb-2">No coupons yet</p>
              <p className="text-gray-500 mb-4">
                Complete your next stay to unlock a 10% loyalty coupon for your following trip.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {coupons.map((coupon) => {
                const status = getCouponStatus(coupon);
                return (
                  <div
                    key={coupon.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Coupon</p>
                        <p className="text-2xl font-bold tracking-widest">{coupon.code}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.classes}`}>
                        {status.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Discount</p>
                      <p className="text-3xl font-bold text-blue-600">{coupon.discountPercent || 10}%</p>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Created: <span className="font-semibold text-gray-900">{formatDate(coupon.createdAt)}</span>
                      </p>
                      <p>
                        Expires:{' '}
                        <span className="font-semibold text-gray-900">
                          {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      onClick={() => navigator.clipboard.writeText(coupon.code)}
                    >
                      Copy code
                    </button>
                    <p className="text-xs text-gray-500">
                      Apply this code during checkout to get your loyalty discount.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


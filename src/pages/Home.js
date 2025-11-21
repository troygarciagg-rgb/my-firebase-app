import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  const { currentUser, userRole } = useAuth();

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin/dashboard';
    if (userRole === 'host') return '/host/dashboard';
    if (userRole === 'guest') return '/guest/home';
    return '/';
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 text-white">
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.2), transparent 50%)'
          }} />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-10 py-20 md:py-28 flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 text-center md:text-left space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-medium tracking-wide">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Trusted platform for hosts & guests
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                Find Your Perfect Stay, Built for <span className="text-cyan-100">Comfort</span>
              </h1>
              <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl">
                Discover curated homes, resorts, and experiences worldwide. Manage bookings in real-time and travel with confidence.
              </p>

              {currentUser ? (
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  {(userRole === 'host' || userRole === 'admin') && (
                    <Link
                      to={getDashboardLink()}
                      className="px-8 py-4 rounded-2xl bg-white text-blue-700 font-semibold text-lg shadow-xl shadow-blue-900/20 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      Go to Dashboard
                    </Link>
                  )}
                  {userRole === 'host' && (
                    <Link
                      to="/host/my-listings"
                      className="px-8 py-4 rounded-2xl border border-white/60 text-white font-semibold text-lg hover:bg-white/10 transition"
                    >
                      Manage Listings
                    </Link>
                  )}
                  {userRole === 'guest' && (
                    <Link
                      to="/guest/browse"
                      className="px-8 py-4 rounded-2xl border border-white/60 text-white font-semibold text-lg hover:bg-white/10 transition"
                    >
                      Browse Places
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <Link
                    to="/register"
                    className="px-8 py-4 rounded-2xl bg-white text-blue-700 font-semibold text-lg shadow-xl shadow-blue-900/20 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Get Started
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 rounded-2xl border border-white/60 text-white font-semibold text-lg hover:bg-white/10 transition"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-white/80 pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Verified hosts & guests</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-200" />
                  <span>Secure payments & support</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-violet-200" />
                  <span>Instant booking updates</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="bg-white/10 backdrop-blur rounded-3xl p-6 shadow-2xl shadow-blue-900/30 border border-white/15 space-y-6">
                <div>
                  <p className="text-white/75 text-sm uppercase tracking-[0.2em] mb-1">Platform Pulse</p>
                  <h3 className="text-2xl font-semibold">Real-time confidence for every trip</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/12 p-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white text-lg">⚡</div>
                    <div>
                      <p className="text-white font-semibold">Live Booking Status</p>
                      <p className="text-white/75 text-sm">Hosts receive instant notifications for every reservation update.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white text-lg">🛡️</div>
                    <div>
                      <p className="text-white font-semibold">Trust & Verification</p>
                      <p className="text-white/75 text-sm">Every account completes identity and email verification before booking.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/12 p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center text-white text-lg">📊</div>
                  <div>
                    <p className="text-white font-semibold">Unified Support Dashboard</p>
                    <p className="text-white/75 text-sm">Track payouts, calendar blocks, and guest communication in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl border border-gray-100">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-6 shadow-lg">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">For Hosts</h3>
              <p className="text-gray-600 leading-relaxed">
                List your property, manage bookings, and earn money with our comprehensive hosting tools.
              </p>
              {!currentUser && (
                <Link
                  to="/register"
                  className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-lg hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105"
                >
                  Become a Host
                </Link>
              )}
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl border border-gray-100">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 mb-6 shadow-lg">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">For Guests</h3>
              <p className="text-gray-600 leading-relaxed">
                Discover unique places and book your perfect stay with ease and confidence.
              </p>
              {!currentUser && (
                <Link
                  to="/register"
                  className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-teal-600 to-blue-500 text-white rounded-lg hover:from-teal-700 hover:to-blue-600 transition-all transform hover:scale-105"
                >
                  Join as Guest
                </Link>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Why Choose T-Harbor?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-lg">
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900">Easy Booking System</h4>
                  <p className="text-gray-600 leading-relaxed">Simple and intuitive booking process for seamless reservations.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900">Secure Payments</h4>
                  <p className="text-gray-600 leading-relaxed">Safe and reliable payment processing with industry-standard security.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg">
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900">Real-time Management</h4>
                  <p className="text-gray-600 leading-relaxed">Manage your listings and bookings in real-time with instant updates.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900">Reviews & Ratings</h4>
                  <p className="text-gray-600 leading-relaxed">Share your experience and help others make informed decisions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

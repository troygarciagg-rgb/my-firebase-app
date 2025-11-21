import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { getListings } from '../../utils/firebaseFunctions';

export default function GuestHome() {
  const categories = [
    { name: 'Home', icon: '🏠', path: '/guest/browse?category=Home', accent: 'from-cyan-400 to-blue-500' },
    { name: 'Hotel', icon: '🏨', path: '/guest/browse?category=Hotel', accent: 'from-pink-400 to-red-500' },
    { name: 'Resort', icon: '🏖️', path: '/guest/browse?category=Resort', accent: 'from-orange-400 to-yellow-400' },
    { name: 'Experience', icon: '🎯', path: '/guest/browse?category=Experience', accent: 'from-purple-400 to-indigo-500' },
    { name: 'Service', icon: '🛎️', path: '/guest/browse?category=Service', accent: 'from-emerald-400 to-teal-500' },
    { name: 'Event Space', icon: '🎪', path: '/guest/browse?category=Event Space', accent: 'from-rose-400 to-fuchsia-500' },
  ];

  const [trending, setTrending] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(true);

  const trendSubtitle = useMemo(() => {
    if (!trending) return '';
    if (trending.bookingCount > 0) {
      return `${trending.bookingCount} bookings this month`;
    }
    return 'Handpicked for you';
  }, [trending]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoadingTrend(true);
        let data = await getListings({
          status: 'published',
          __skipStatusQuery: true,
          __filterPublished: true,
        });

        if (!data || data.length === 0) {
          setTrending(null);
          return;
        }

        const sorted = [...data].sort(
          (a, b) => (b.bookingCount || 0) - (a.bookingCount || 0)
        );

        const best = sorted.find((listing) => (listing.bookingCount || 0) > 0);
        let featuredListing = best || data[Math.floor(Math.random() * data.length)];

        setTrending({
          id: featuredListing.id,
          title: featuredListing.title || 'Inspired Stay',
          location:
            featuredListing.location?.city || featuredListing.location?.country || 'Worldwide',
          bookingCount: featuredListing.bookingCount || 0,
          guests: featuredListing.maxGuests || featuredListing.capacity || 2,
          category: featuredListing.category || 'Premium Stay',
          image:
            featuredListing.image ||
            featuredListing.imageURLs?.[0] ||
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80',
        });
      } catch (error) {
        console.error('[GuestHome] Failed to load trending listing:', error);
        setTrending(null);
      } finally {
        setLoadingTrend(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar role="guest" />
        <div className="flex-1 bg-gray-50 min-h-screen">
          <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 text-white rounded-bl-[48px] shadow-xl shadow-blue-900/20">
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.2), transparent 50%)'
            }} />
            <div className="relative max-w-5xl mx-auto px-8 py-16 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full text-sm font-medium tracking-wide">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
                  Curated stays for every journey
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">Find Your Perfect Stay</h1>
                <p className="text-lg text-white/85">
                  Explore homes, hotels, and experiences tailored to your mood. Real reviews and instant availability make trip planning effortless.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link
                    to="/guest/browse"
                    className="px-7 py-3 rounded-2xl bg-white text-blue-700 font-semibold shadow-lg shadow-blue-900/20 transition-transform hover:-translate-y-0.5"
                  >
                    Start Exploring
                  </Link>
                  <Link
                    to="/guest/recommendations"
                    className="px-7 py-3 rounded-2xl border border-white/50 text-white font-semibold hover:bg-white/10 transition"
                  >
                    Personalized picks
                  </Link>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/20 shadow-2xl shadow-blue-900/30 space-y-4">
                  <p className="text-sm text-white/70 uppercase tracking-[0.3em]">Trending now</p>
                  {loadingTrend ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-20 bg-white/20 rounded-2xl" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-16 bg-white/15 rounded-2xl" />
                        <div className="h-16 bg-white/15 rounded-2xl" />
                      </div>
                    </div>
                  ) : trending ? (
                    <>
                      <div className="bg-white/95 rounded-2xl p-4 flex items-center gap-4">
                        <img
                          src={trending.image}
                          alt={trending.title}
                          className="h-16 w-16 rounded-2xl object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=300&q=60';
                          }}
                        />
                        <div>
                          <p className="text-gray-600 text-sm">{trendSubtitle}</p>
                          <p className="text-xl font-semibold text-gray-900">{trending.title}</p>
                          <p className="text-sm text-gray-500">{trending.location}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/15 p-4">
                          <p className="text-sm text-white/70">Category</p>
                          <p className="text-xl font-semibold">{trending.category}</p>
                        </div>
                        <div className="rounded-2xl bg-white/15 p-4">
                          <p className="text-sm text-white/70">Best for</p>
                          <p className="text-xl font-semibold">{trending.guests}+ guests</p>
                        </div>
                      </div>
                      <Link
                        to={`/guest/listing/${trending.id}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition"
                      >
                        View listing →
                      </Link>
                    </>
                  ) : (
                    <p className="text-white/70 text-sm">
                      We’ll spotlight trending stays as soon as listings are available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="px-8 py-12 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-[0.3em]">Browse</p>
                <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
                <p className="text-gray-500">Tap a category to jump straight into the curated listings.</p>
              </div>
              <Link to="/guest/browse" className="text-blue-600 font-semibold hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to={category.path}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 group flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${category.accent} text-3xl flex items-center justify-center text-white shadow-lg shadow-gray-900/10 mb-4`}>
                    {category.icon}
                  </div>
                  <div className="font-semibold text-gray-900">{category.name}</div>
                  <p className="text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2">See listings</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


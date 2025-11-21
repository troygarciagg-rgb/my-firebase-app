import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../utils/firebaseFunctions';
import LogoutModal from './LogoutModal';
import Logo from './Logo';

export default function Navbar() {
  const { currentUser, userRole } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!currentUser) return;
      
      try {
        const userData = await getUser(currentUser.uid);
        if (userData?.profilePhoto) {
          setProfilePhoto(userData.profilePhoto);
        } else if (currentUser.photoURL) {
          setProfilePhoto(currentUser.photoURL);
        }
      } catch (error) {
        console.error('Error loading profile photo:', error);
      }
    };

    loadProfilePhoto();
  }, [currentUser]);

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/admin/dashboard';
    if (userRole === 'host') return '/host/dashboard';
    if (userRole === 'guest') return '/guest/home';
    return '/';
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-3 transition-transform duration-200 hover:scale-105"
            >
              <Logo size="default" variant="light" />
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3 md:space-x-4">
            {currentUser ? (
              <>
                {/* User Info */}
                <div className="hidden lg:flex flex-col text-right leading-tight pr-4 border-r border-gray-200">
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                    Signed in as
                  </span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </span>
                </div>

                {/* Navigation Links */}
                {userRole === 'guest' && (
                  <Link
                    to="/guest/browse"
                    className="px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 hover:shadow-sm"
                  >
                    Browse
                  </Link>
                )}
                {(userRole === 'host' || userRole === 'admin') && (
                  <Link
                    to={getDashboardLink()}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors rounded-xl hover:bg-gray-50"
                  >
                    Dashboard
                  </Link>
                )}

                {/* Profile Avatar */}
                <Link
                  to="/settings"
                  className="relative group"
                  title="Account Settings"
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-11 h-11 rounded-full object-cover border-2 border-gray-200 hover:border-blue-500 transition-all cursor-pointer shadow-md hover:shadow-lg ring-2 ring-transparent hover:ring-blue-100"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 hover:border-blue-500 transition-all cursor-pointer shadow-md hover:shadow-lg ring-2 ring-transparent hover:ring-blue-100">
                      {(currentUser.displayName || currentUser.email || 'U')?.[0].toUpperCase()}
                    </div>
                  )}
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-red-500 shadow-md shadow-red-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors rounded-xl hover:bg-gray-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl hover:from-blue-700 hover:to-teal-600 transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
    </nav>
  );
}


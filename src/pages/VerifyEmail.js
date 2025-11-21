import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { reload } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function VerifyEmail() {
  const { currentUser, emailVerified, sendVerificationEmail, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get email from location state or currentUser
    const email = location.state?.email || currentUser?.email || '';
    setUserEmail(email);

    // If user is not logged in and no email provided, redirect to login
    if (!currentUser && !email) {
      navigate('/login');
      return;
    }

    // Check email verification status periodically
    const checkVerification = async () => {
      if (currentUser) {
        // Reload user to get latest emailVerified status
        try {
          await reload(currentUser);
          if (currentUser.emailVerified) {
            // Clear any local storage
            localStorage.removeItem('authState');
            // Redirect to login with success message
            navigate('/login', { 
              state: { 
                message: 'Your email has been verified. Please log in.',
                email: email 
              } 
            });
          }
        } catch (error) {
          console.error('Error checking verification:', error);
        }
      }
    };

    // If email is already verified, redirect to login immediately
    if (emailVerified) {
      localStorage.removeItem('authState');
      navigate('/login', { 
        state: { 
          message: 'Your email has been verified. Please log in.',
          email: email 
        } 
      });
      return;
    }

    // Check verification status every 2 seconds if user is logged in
    let intervalId;
    if (currentUser) {
      intervalId = setInterval(checkVerification, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser, emailVerified, location, navigate]);

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);

    try {
      if (currentUser) {
        await sendVerificationEmail();
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      } else {
        setError('Please log in first to resend verification email.');
      }
    } catch (err) {
      setError('Failed to send verification email: ' + err.message);
    } finally {
      setResending(false);
    }
  };

  const handleOpenGmail = () => {
    window.open('https://mail.google.com', '_blank');
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  if (!currentUser && !userEmail) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all hover:shadow-3xl">
            {/* Animated Checkmark Icon */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 mb-6 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 animate-ping opacity-20"></div>
                <svg 
                  className="h-12 w-12 text-white relative z-10 animate-scale-in" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                We sent a verification link to
              </p>
              <p className="text-lg font-semibold text-gray-900 mb-6">
                {userEmail || currentUser?.email}
              </p>
            </div>

            {/* Success Message */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">
                <strong>Please check your email</strong> and click the verification link to activate your T-Harbor account.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Didn't receive the email? Check your spam folder or click the button below to resend.
              </p>
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg animate-fade-in">
                <p className="font-medium">{message}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-pulse">
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resending || loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all hover:scale-105"
              >
                {resending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Resend Verification Email
                  </>
                )}
              </button>

              <button
                onClick={handleOpenGmail}
                className="w-full flex justify-center items-center py-3 px-4 border-2 border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                Open Gmail
              </button>

              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  Sign Out
                </button>
              )}
            </div>

            <div className="text-center text-sm text-gray-500 pt-4">
              <p>After verifying your email, you can sign in to your T-Harbor account.</p>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
}

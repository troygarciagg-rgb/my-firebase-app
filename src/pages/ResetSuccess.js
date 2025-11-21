import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function ResetSuccess() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-teal-500 mb-4">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Email Sent!
              </h2>
              <p className="text-gray-600">
                A password reset link has been sent to your email. Check your inbox.
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg text-left">
              <p className="text-sm text-blue-800">
                <strong>Didn't receive the email?</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all hover:scale-105 shadow-lg"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


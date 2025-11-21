import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetSuccess from './pages/ResetSuccess';
import ChangePassword from './pages/ChangePassword';
import AccountSettings from './pages/AccountSettings';

// Host Pages
import HostDashboard from './pages/host/HostDashboard';
import MyListings from './pages/host/MyListings';
import AddListing from './pages/host/AddListing';
import EditListing from './pages/host/EditListing';
import ViewBookings from './pages/host/ViewBookings';
import Messages from './pages/host/Messages';
import Calendar from './pages/host/Calendar';
import PaymentMethods from './pages/host/PaymentMethods';

// Guest Pages
import GuestHome from './pages/guest/GuestHome';
import Browse from './pages/guest/Browse';
import ListingDetails from './pages/guest/ListingDetails';
import MyBookings from './pages/guest/MyBookings';
import Favorites from './pages/guest/Favorites';
import Wishlist from './pages/guest/Wishlist';
import MyCoupons from './pages/guest/MyCoupons';
import Recommendations from './pages/guest/Recommendations';
import GuestMessages from './pages/guest/Messages';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ListingManagement from './pages/admin/ListingManagement';
import BookingManagement from './pages/admin/BookingManagement';
import Reports from './pages/admin/Reports';

function AppRoutes() {
  const { currentUser, userRole, emailVerified } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={currentUser && emailVerified ? <Navigate to={getDashboardPath(userRole)} /> : <Login />} />
      <Route path="/register" element={currentUser && emailVerified ? <Navigate to={getDashboardPath(userRole)} /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-success" element={<ResetSuccess />} />
      <Route path="/change-password" element={<ChangePassword />} />
      
      {/* Account Settings - Available to all authenticated users */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        }
      />

      {/* Host Routes */}
      <Route
        path="/host/dashboard"
        element={
          <ProtectedRoute requiredRole="host">
            <HostDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/my-listings"
        element={
          <ProtectedRoute requiredRole="host">
            <MyListings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/add-listing"
        element={
          <ProtectedRoute requiredRole="host">
            <AddListing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/edit-listing/:id"
        element={
          <ProtectedRoute requiredRole="host">
            <EditListing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/view-bookings"
        element={
          <ProtectedRoute requiredRole="host">
            <ViewBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/messages"
        element={
          <ProtectedRoute requiredRole="host">
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/calendar"
        element={
          <ProtectedRoute requiredRole="host">
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/host/payment-methods"
        element={
          <ProtectedRoute requiredRole="host">
            <PaymentMethods />
          </ProtectedRoute>
        }
      />

      {/* Guest Routes */}
      <Route
        path="/guest/home"
        element={
          <ProtectedRoute requiredRole="guest">
            <GuestHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/browse"
        element={<Browse />}
      />
      <Route
        path="/guest/listing/:id"
        element={
          <ProtectedRoute requiredRole="guest">
            <ListingDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/my-bookings"
        element={
          <ProtectedRoute requiredRole="guest">
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/wishlist"
        element={
          <ProtectedRoute requiredRole="guest">
            <Wishlist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/favorites"
        element={
          <ProtectedRoute requiredRole="guest">
            <Favorites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/my-coupons"
        element={
          <ProtectedRoute requiredRole="guest">
            <MyCoupons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/recommendations"
        element={
          <ProtectedRoute requiredRole="guest">
            <Recommendations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/messages"
        element={
          <ProtectedRoute requiredRole="guest">
            <GuestMessages />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/listings"
        element={
          <ProtectedRoute requiredRole="admin">
            <ListingManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedRoute requiredRole="admin">
            <BookingManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute requiredRole="admin">
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function getDashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'host') return '/host/dashboard';
  if (role === 'guest') return '/guest/home';
  return '/';
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

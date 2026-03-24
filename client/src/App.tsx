import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';

// Lazy load page components
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage'));
const NewReservationPage = React.lazy(() => import('./pages/reservations/NewReservationPage'));
const ReservationsListPage = React.lazy(() => import('./pages/reservations/ReservationsListPage'));
const ReservationDetailPage = React.lazy(() => import('./pages/reservations/ReservationDetailPage'));
const CheckInPage = React.lazy(() => import('./pages/reservations/CheckInPage'));
const CheckOutPage = React.lazy(() => import('./pages/reservations/CheckOutPage'));
const RoomsPage = React.lazy(() => import('./pages/rooms/RoomsPage'));
const HotelsPage = React.lazy(() => import('./pages/admin/HotelsPage'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage'));
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'));
const SuperAdminDashboard = React.lazy(() => import('./pages/admin/SuperAdminDashboard'));
const ReportsPage = React.lazy(() => import('./pages/reports/ReportsPage'));

// A simple fallback loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gold rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading module...</p>
      </div>
    </div>
  );
}

function App() {
  const { isLoading, user } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading application...</div>;

  return (
    <>
      <Toaster position="top-right" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/:hotelSlug/dashboard" element={<DashboardPage />} />
            <Route path="/:hotelSlug/reservations" element={<ReservationsListPage />} />
            <Route path="/:hotelSlug/reservations/new" element={<NewReservationPage />} />
            <Route path="/:hotelSlug/reservations/:id" element={<ReservationDetailPage />} />
            <Route path="/:hotelSlug/reservations/:id/checkin" element={<CheckInPage />} />
            <Route path="/:hotelSlug/reservations/:id/checkout" element={<CheckOutPage />} />
            <Route path="/:hotelSlug/rooms" element={<RoomsPage />} />
            <Route path="/:hotelSlug/settings" element={<SettingsPage />} />
            <Route path="/:hotelSlug/users" element={<UsersPage />} />
            <Route path="/:hotelSlug/reports" element={<ReportsPage />} />
            
            {/* Super Admin Routes */}
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/admin/hotels" element={<HotelsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default App;

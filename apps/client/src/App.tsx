import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DriverRoute } from './components/DriverRoute';
import { AdminRoute } from './components/AdminRoute';
import { Navbar } from './components/Navbar';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RideSearchPage } from './pages/RideSearchPage';
import { RideDetailsPage } from './pages/RideDetailsPage';
import { CreateRidePage } from './pages/CreateRidePage';
import { MyRidesPage } from './pages/MyRidesPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Enterprise Commuter Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/rides" element={<RideSearchPage />} />
                  <Route path="/rides/:id" element={<RideDetailsPage />} />
                  <Route path="/my-rides" element={<MyRidesPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Driver Only Routes */}
                  <Route element={<DriverRoute />}>
                    <Route path="/rides/create" element={<CreateRidePage />} />
                    <Route path="/vehicles" element={<VehiclesPage />} />
                  </Route>

                  {/* Admin Only Route */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

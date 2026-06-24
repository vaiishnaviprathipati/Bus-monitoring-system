import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import GovernmentDashboard from './pages/GovernmentDashboard';

import Landing from './pages/Landing';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'citizen' | 'admin' }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && user?.role !== role) return <Navigate to={user?.role === 'admin' ? '/government-dashboard' : '/citizen-dashboard'} />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/citizen-dashboard" 
            element={<CitizenDashboard />} 
          />
          <Route 
            path="/government-dashboard" 
            element={
              <ProtectedRoute role="admin">
                <GovernmentDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

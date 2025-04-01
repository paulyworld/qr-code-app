import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import QRGenerator from './components/QRGenerator';
import QRCodeList from './components/QRCodeList';
import Analytics from './components/Analytics';
import PrivateRoute from './components/PrivateRoute';

// Services
import { checkAuthStatus } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkAuthStatus();
        setIsAuthenticated(result);
      } catch (error) {
        console.error('Auth verification error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<QRGenerator isAuthenticated={isAuthenticated} />} />
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" /> : <Login setIsAuthenticated={setIsAuthenticated} />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/" /> : <Register setIsAuthenticated={setIsAuthenticated} />
            } />
            <Route path="/my-codes" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <QRCodeList />
              </PrivateRoute>
            } />
            <Route path="/analytics/:codeId" element={
              <PrivateRoute isAuthenticated={isAuthenticated}>
                <Analytics />
              </PrivateRoute>
            } />
          </Routes>
        </main>
        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

export default App;
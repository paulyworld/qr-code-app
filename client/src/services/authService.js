import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

export const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Registration failed';
  }
};

export const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Login failed';
  }
};

export const logout = async () => {
  try {
    const response = await axios.post(`${API_URL}/auth/logout`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Logout failed';
  }
};

export const checkAuthStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/verify`);
    return response.data.isAuthenticated;
  } catch (error) {
    return false;
  }
};
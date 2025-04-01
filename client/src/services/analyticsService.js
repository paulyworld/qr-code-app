import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

export const fetchQRCodeAnalytics = async (qrCodeId) => {
  try {
    const response = await axios.get(`${API_URL}/analytics/${qrCodeId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch analytics data';
  }
};
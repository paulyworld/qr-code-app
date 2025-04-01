import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

export const saveQRCode = async (qrCodeData) => {
  try {
    const response = await axios.post(`${API_URL}/qrcodes`, qrCodeData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to save QR code';
  }
};

export const fetchQRCodes = async () => {
  try {
    const response = await axios.get(`${API_URL}/qrcodes`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch QR codes';
  }
};

export const fetchQRCode = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/qrcodes/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch QR code';
  }
};

export const deleteQRCode = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/qrcodes/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to delete QR code';
  }
};
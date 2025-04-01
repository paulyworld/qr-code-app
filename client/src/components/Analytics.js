import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { fetchQRCodeAnalytics } from '../services/analyticsService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4CAF50', '#F44336', '#9C27B0'];

const Analytics = () => {
  const { codeId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [qrCode, setQRCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  
  useEffect(() => {
    const getAnalytics = async () => {
      try {
        setLoading(true);
        const data = await fetchQRCodeAnalytics(codeId);
        setQRCode(data.qrCode);
        setAnalytics(data.analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    getAnalytics();
  }, [codeId]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">No data available</h2>
        <p className="mb-4">There is no analytics data available for this QR code.</p>
        <Link to="/my-codes" className="text-blue-600 hover:underline">
          Back to my QR codes
        </Link>
      </div>
    );
  }
  
  // Format daily scans data for charts
  const formatDailyScans = () => {
    const now = new Date();
    const dates = [];
    
    if (timeRange === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
    } else if (timeRange === 'month') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
    } else {
      // All time (sort and use all available dates)
      dates.push(...Object.keys(analytics.dailyScans).sort());
    }
    
    return dates.map(date => ({
      date,
      scans: analytics.dailyScans[date] || 0
    }));
  };
  
  // Format device type data for pie chart
  const deviceData = [
    { name: 'Desktop', value: analytics.deviceTypes.desktop },
    { name: 'Mobile', value: analytics.deviceTypes.mobile },
    { name: 'Tablet', value: analytics.deviceTypes.tablet }
  ].filter(item => item.value > 0);
  
  // Format browser data for pie chart
  const browserData = Object.entries(analytics.browsers)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  
  // Format country data for bar chart
  const countryData = Object.entries(analytics.geoDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  
  // Format hourly distribution data
  const hourlyData = analytics.hourlyDistribution.map((value, index) => ({
    hour: index,
    scans: value
  }));
  
  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <Link to="/my-codes" className="text-blue-600 hover:underline mb-2 inline-block">
          &larr; Back to my QR codes
        </Link>
        <h1 className="text-2xl font-bold">{qrCode.name} - Analytics</h1>
        <p className="text-gray-600">
          URL: <a href={qrCode.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {qrCode.url}
          </a>
        </p>
        <p className="text-gray-600">
          Created: {new Date(qrCode.createdAt).toLocaleDateString()}
        </p>
        <p className="text-lg font-semibold mt-2">
          Total Scans: {qrCode.totalScans}
        </p>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Scans Over Time</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 rounded ${timeRange === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded ${timeRange === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1 rounded ${timeRange === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              All
            </button>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formatDailyScans()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="scans"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="Scans"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Device Types</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} scans`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Top Browsers</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={browserData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {browserData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} scans`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Top Countries</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={countryData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" name="Scans" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Scans by Hour (UTC)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="scans" name="Scans" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Scans</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">Time</th>
                <th className="py-2 px-4 border-b text-left">Location</th>
                <th className="py-2 px-4 border-b text-left">Device</th>
                <th className="py-2 px-4 border-b text-left">Browser</th>
                <th className="py-2 px-4 border-b text-left">OS</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentScans.map((scan, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 px-4 border-b">
                    {new Date(scan.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-4 border-b">{scan.location}</td>
                  <td className="py-2 px-4 border-b">{scan.device}</td>
                  <td className="py-2 px-4 border-b">{scan.browser}</td>
                  <td className="py-2 px-4 border-b">{scan.os}</td>
                </tr>
              ))}
              {analytics.recentScans.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500">
                    No scan data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

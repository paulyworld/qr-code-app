// QRCodeList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchQRCodes, deleteQRCode } from '../services/qrCodeService';

const QRCodeList = () => {
  const [qrCodes, setQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();
  const [modalImage, setModalImage] = useState(null);

  const openModal = (imageData) => setModalImage(imageData);
  const closeModal = () => setModalImage(null);

  useEffect(() => {
    const loadQRCodes = async () => {
      try {
        setLoading(true);
        const data = await fetchQRCodes();
        setQRCodes(data.qrCodes);
      } catch (error) {
        console.error('Error fetching QR codes:', error);
        toast.error('Failed to load your QR codes');
      } finally {
        setLoading(false);
      }
    };

    loadQRCodes();
  }, []);

  useEffect(() => {
    if (qrCodes.length > 0) {
      qrCodes.forEach((qr) => {
        console.log('QR Image Data for:', qr.name, qr.qrImageData);
      });
    }
  }, [qrCodes]);

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = async (id) => {
    try {
      await deleteQRCode(id);
      setQRCodes(qrCodes.filter(code => code._id !== id));
      toast.success('QR Code deleted successfully');
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast.error('Failed to delete QR code');
    } finally {
      setConfirmDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  const downloadImage = (dataUrl, name) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${name || 'qrcode'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (qrCode) => {
    navigate('/generate', { state: { qrCode } });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading your QR codes...</div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My QR Codes</h1>
        <Link
          to="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create New QR Code
        </Link>
      </div>

      {qrCodes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg mb-4">You haven't created any QR codes yet.</p>
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your First QR Code
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 border-b text-left">Name</th>
                <th className="py-3 px-4 border-b text-left">URL</th>
                <th className="py-3 px-4 border-b text-center">Scans</th>
                <th className="py-3 px-4 border-b text-left">Created</th>
                <th className="py-3 px-4 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {qrCodes.map((qrCode) => (
                <tr key={qrCode._id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{qrCode.name}</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="mb-1">
                      <span className="text-xs font-semibold text-gray-600">Target URL:</span>
                      <a
                        href={qrCode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-xs"
                      >
                        {qrCode.url}
                      </a>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-600">Tracking URL:</span>
                      <a
                        href={`${window.location.origin}/q/${qrCode.shortId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-xs"
                      >
                        {`${window.location.origin}/q/${qrCode.shortId}`}
                      </a>
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b text-center">
                    <span className="font-medium">{qrCode.scans}</span>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {new Date(qrCode.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex flex-col space-y-2 items-center">
                    {console.log('Rendering QR image:', qrCode.name, qrCode.qrImageData?.substring(0, 30))}
                    {qrCode.qrImageData ? (
                        <img
                          src={qrCode.qrImageData}
                          alt={`QR for ${qrCode.name}`}
                          className="w-24 h-24 object-contain border rounded cursor-pointer"
                          onClick={() => openModal(qrCode.qrImageData)}
                        />
                      ) : (
                        <p className="text-sm text-gray-400">No preview</p>
                      )}
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                      <button
                          onClick={() => downloadImage(qrCode.qrImageData, `${qrCode.name || 'qr-code'}.png`)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          disabled={!qrCode.qrImageData}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleEdit(qrCode)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                        >
                          Edit
                        </button>
                        <Link
                          to={`/analytics/${qrCode._id}`}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                        >
                          Analytics
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(qrCode._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete this QR code? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(confirmDelete)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg relative max-w-sm w-full">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
              onClick={closeModal}
            >
              &times;
            </button>
            <img src={modalImage} alt="Full QR Code" className="w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeList;

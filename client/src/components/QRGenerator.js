// QRGenerator.js (Step 2: Add name input field)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'react-toastify';
import { saveQRCode } from '../services/qrCodeService';
import ColorPicker from './ColorPicker';
import { API_URL } from '../config';

const QRGenerator = ({ isAuthenticated }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(256);
  const [includeMargin, setIncludeMargin] = useState(true);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [qrStyle, setQrStyle] = useState('dots');
  const [cornerStyle, setCornerStyle] = useState('square');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);

  const navigate = useNavigate();
  const baseUrl = API_URL;

  useEffect(() => {
    if (logoFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(logoFile);
    } else {
      setLogoPreview(null);
    }
  }, [logoFile]);

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    if (qrCodeGenerated) {
      setQrCodeGenerated(false);
      setTrackingUrl('');
    }
  };

  const validateUrl = (url) => {
    let processedUrl = url;
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = 'https://' + processedUrl;
    }
    try {
      new URL(processedUrl);
      return { valid: true, url: processedUrl };
    } catch {
      return { valid: false, url: processedUrl };
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.match('image.*')) {
      setLogoFile(file);
    } else {
      toast.error('Please select a valid image file');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const generateQRCode = () => {
    const validation = validateUrl(url);
    if (!validation.valid) {
      toast.error('Please enter a valid URL');
      return;
    }
    const processedUrl = validation.url;
    const tempShortId = Math.random().toString(36).substring(2, 8);
    const previewTrackingUrl = `${baseUrl}/q/${tempShortId}`;

    setUrl(processedUrl);
    setTrackingUrl(previewTrackingUrl);
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      setQrCodeGenerated(true);
      toast.success('Preview generated! Now click Save to finalize your QR code.');
    }, 300);
  };

  const downloadQRCode = () => {
    if (!qrCodeGenerated) {
      toast.error('Please generate a QR code first');
      return;
    }
    const canvas = document.getElementById('qrcode');
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = 'qrcode.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const saveQR = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to save your QR code');
      navigate('/login');
      return;
    }
    const validation = validateUrl(url);
    if (!validation.valid) {
      toast.error('Please enter a valid URL');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a name for your QR code');
      return;
    }

    const canvas = document.getElementById('qrcode');
    const qrImageData = canvas.toDataURL('image/png');

    const qrData = {
      name,
      url,
      qrImageData,
      settings: {
        qrColor,
        bgColor,
        size,
        includeMargin,
        qrStyle,
        cornerStyle,
        hasLogo: !!logoFile
      }
    };

    setIsSaving(true);
    try {
      const response = await saveQRCode(qrData);
      if (response?.qrCode?.shortId) {
        const finalTrackingUrl = `${baseUrl}/q/${response.qrCode.shortId}`;
        setTrackingUrl(finalTrackingUrl);
        setQrCodeGenerated(false);
        setTimeout(() => {
          setQrCodeGenerated(true);
          toast.success('QR Code saved and updated successfully!');
        }, 100);
      } else {
        throw new Error('No shortId returned');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save QR code. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Custom QR Code Generator</h1>

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          QR Code Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your QR code"
          className="w-full rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Destination URL
            </label>
            <div className="flex">
              <input
                type="text"
                id="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com"
                className="flex-grow rounded-l-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={generateQRCode}
                disabled={isGenerating}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Customization Options</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code Color
                </label>
                <ColorPicker color={qrColor} onChange={setQrColor} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <ColorPicker color={bgColor} onChange={setBgColor} />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                QR Code Size
              </label>
              <input
                type="range"
                min="128"
                max="512"
                step="8"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-right">{size}px</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code Style
                </label>
                <select
                  value={qrStyle}
                  onChange={(e) => setQrStyle(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="dots">Dots</option>
                  <option value="squares">Squares</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corner Style
                </label>
                <select
                  value={cornerStyle}
                  onChange={(e) => setCornerStyle(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 p-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="square">Square</option>
                  <option value="rounded">Rounded</option>
                  <option value="extra-rounded">Extra Rounded</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="include-margin"
                type="checkbox"
                checked={includeMargin}
                onChange={(e) => setIncludeMargin(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="include-margin" className="ml-2 block text-sm text-gray-700">
                Include Margin
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo (Optional)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
                >
                  Upload Logo
                </label>
                {logoPreview && (
                  <button
                    onClick={removeLogo}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              {logoPreview && (
                <div className="mt-2">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="h-16 w-16 object-contain border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-center bg-white">
            <div className="relative">
              <QRCodeCanvas
                id="qrcode"
                value={qrCodeGenerated ? trackingUrl : (url || "https://example.com")}
                size={size}
                fgColor={qrColor}
                bgColor={bgColor}
                level="H" // Higher error correction when using a logo
                includeMargin={includeMargin}
                imageSettings={
                  logoPreview
                    ? {
                        src: logoPreview,
                        x: null,
                        y: null,
                        height: size * 0.2,
                        width: size * 0.2,
                        excavate: true,
                      }
                    : undefined
                }
              />
            </div>
          </div>
          
          {qrCodeGenerated && (
            <div className="mt-4 mb-4 p-3 bg-gray-100 rounded-md w-full">
              <p className="text-sm font-medium text-gray-700">QR Code Tracking URL:</p>
              <p className="text-sm break-all font-mono">{trackingUrl}</p>
              <p className="text-sm text-gray-500 mt-1">This URL will track scans and redirect to:</p>
              <p className="text-sm break-all font-mono text-blue-600">{url}</p>
            </div>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={downloadQRCode}
              disabled={!qrCodeGenerated}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              Download
            </button>
            <button
              onClick={saveQR}
              disabled={isSaving || !qrCodeGenerated}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          
          {!isAuthenticated && (
            <p className="text-sm text-gray-500 mt-2">
              Login to save your QR codes and track analytics
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
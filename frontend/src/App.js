import React, { useState, useRef } from "react";
import "./App.css";
import { Upload, Download, FileText, CheckCircle, AlertCircle, Image, Table } from "lucide-react";
import axios from "axios";

// Get backend URL from environment variable or default to localhost
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedData(null);
      setProcessingId(null);
      setError(null);
    } else {
      setError("Please select a valid image file (JPG, PNG, GIF)");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const processImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log(`Making request to: ${API}/upload-image`);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for AI processing
      });

      console.log('Upload response:', response.data);

      if (response.data.success) {
        setExtractedData(response.data.table_data);
        setProcessingId(response.data.processing_id);
      } else {
        setError(response.data.message || 'Failed to process image');
      }
    } catch (err) {
      console.error('Processing error:', err);
      
      if (err.code === 'ECONNREFUSED') {
        setError('Cannot connect to backend server. Make sure the backend is running on port 8000.');
      } else if (err.response?.status === 500) {
        setError('Server error during processing. Please check backend logs.');
      } else {
        setError(err.response?.data?.detail || err.message || 'Error processing image');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = async () => {
    if (!processingId) return;

    try {
      console.log(`Downloading Excel from: ${API}/generate-excel/${processingId}`);
      
      const response = await axios.post(`${API}/generate-excel/${processingId}`, {}, {
        responseType: 'blob',
        timeout: 30000,
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedFile.name.split('.')[0]}_extracted.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('Excel file downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      setError('Error downloading Excel file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
              <Table className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Handwritten Table Converter
              </h1>
              <p className="text-gray-600 text-sm">Convert handwritten tables to Excel files instantly</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Connection Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                <strong>Connected to:</strong> {BACKEND_URL} | 
                <strong> Database:</strong> MongoDB localhost:27017
              </span>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Your Handwritten Table Image
            </h2>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50/50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-64 rounded-lg shadow-md border border-gray-200"
                    />
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Choose Different Image
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Image className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-gray-600 font-medium">Drop your handwritten table image here or click to browse</p>
                    <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG, GIF files</p>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && !extractedData && (
              <div className="mt-6">
                <button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing with AI... (this may take 10-30 seconds)
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Extract Table Data with AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Error:</p>
                <p>{error}</p>
                {error.includes('Cannot connect to backend') && (
                  <div className="mt-2 text-xs">
                    <p><strong>Troubleshooting:</strong></p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Make sure the backend server is running on port 8000</li>
                      <li>Check if MongoDB is running</li>
                      <li>Verify the backend .env file is configured correctly</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {extractedData && (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Extracted Table Data
                </h2>
                <button
                  onClick={downloadExcel}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      {extractedData[0]?.map((header, index) => (
                        <th key={index} className="border border-gray-300 px-4 py-3 text-left font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>✓ Table extracted with {extractedData.length} rows and {extractedData[0]?.length} columns</p>
                <p>✓ Professional Excel formatting will be applied to your download</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6">
            <h3 className="font-semibold text-indigo-900 mb-3">How to use (Localhost Setup):</h3>
            <div className="space-y-2 text-sm text-indigo-700">
              <p>1. 📸 Upload a clear image of your handwritten table (JPG, PNG, GIF)</p>
              <p>2. 🧠 Click "Extract Table Data" - AI will analyze your handwriting (10-30 seconds)</p>
              <p>3. 📊 Review the extracted data in the preview table below</p>
              <p>4. 📄 Click "Download Excel" to get your professionally formatted Excel file</p>
              <p className="pt-2 font-medium">💡 Tips: Ensure good lighting, clear handwriting, and first row contains headers</p>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">Debug Information</summary>
              <div className="space-y-1 text-gray-600">
                <p><strong>Frontend URL:</strong> http://localhost:3000</p>
                <p><strong>Backend URL:</strong> {BACKEND_URL}</p>
                <p><strong>API Endpoint:</strong> {API}</p>
                <p><strong>Status:</strong> {selectedFile ? 'Image loaded' : 'Waiting for image'}</p>
                {processingId && <p><strong>Processing ID:</strong> {processingId}</p>}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
import React, { useState } from 'react';
import Layout from '../components/Layout';
import useAppStore from '../store/useAppStore';
import Tesseract from 'tesseract.js';
import { Upload, FileText, CheckCircle, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const RegisterUpload = () => {
  const { employees, addRecord } = useAppStore();
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState([]);
  const [saved, setSaved] = useState(false);

  // Mock Date for adminPurpose
  const todayDate = new Date().toISOString().split('T')[0];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setExtractedData([]); // Reset
      setSaved(false);
    }
  };

  const processOCR = async () => {
    if (!image) return;
    setProcessing(true);
    setProgress(0);

    // Using Tesseract.js to scan the uploaded image
    Tesseract.recognize(
      image,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress * 100));
          }
        }
      }
    ).then(({ data: { text } }) => {
      // Very basic parsing logic for Adminnstration
      // Assuming register format: "Name - HH:MM M - HH:MM M"
      // e.g. "John - 09:00 - 18:00"

      const lines = text.split('\n').filter(l => l.trim().length > 5);
      const parsed = lines.map((line, idx) => {
        // Attempt simple generic regex matching times (HH:MM or H:MM)
        const times = line.match(/\d{1,2}:\d{2}/g) || [];

        let foundEmpId = '';
        let foundName = '';

        // Find best matching employee
        for (let emp of employees) {
          if (line.toLowerCase().includes(emp.name.toLowerCase().split(' ')[0])) {
            foundEmpId = emp.id;
            foundName = emp.name;
          }
        }

        return {
          id: `ocr-${idx}`,
          empId: foundEmpId,
          rawName: foundName || 'Unknown / Manual',
          inTime: times[0] || '',
          outTime: times[1] || ''
        };
      });

      setExtractedData(parsed);
      setProcessing(false);
      setProgress(100);
    });
  };

  const handleSaveToDB = () => {
    extractedData.forEach(data => {
      if (data.empId && data.inTime) {
        addRecord({
          id: Date.now().toString() + Math.random(),
          empId: data.empId,
          date: todayDate,
          inTime: data.inTime,
          outTime: data.outTime || '',
          source: 'OCR'
        });
      }
    });
    setSaved(true);
  };

  const handleRowChange = (id, field, value) => {
    setExtractedData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 items-center flex justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Smart Register OCR</h1>
            <p className="text-gray-400">Upload a physical register photo to extract attendance data.</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl text-purple-300 flex items-center gap-2">
            <Scan className="w-5 h-5" /> Powered by Tesseract.js
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Uploader UI */}
          <div className="glass-panel p-8">
            <label className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-2xl h-80 flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden">
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              {image ? (
                <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen group-hover:opacity-30 transition-all" />
              ) : (
                <ImageIcon size={64} className="text-gray-500 mb-4 group-hover:text-purple-400 transition-colors" />
              )}
              {image && <div className="absolute inset-0 bg-black/50" />}

              <div className="z-10 text-center">
                <p className="text-lg font-bold mb-1">{image ? 'Change Image' : 'Drop Register Photo Here'}</p>
                <p className="text-sm text-gray-400">Supports JPG, PNG, WEBP</p>
              </div>
            </label>

            <button
              onClick={processOCR}
              disabled={!image || processing}
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {processing ? `Scanning... ${progress}%` : <><Upload size={18} /> Extract AI Data</>}
            </button>

            {processing && (
              <div className="w-full bg-white/10 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>

          {/* Validation & Results Table */}
          <div className="glass-panel p-8 flex flex-col h-[500px]">
            <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
              Extracted Matrix
              {saved && <span className="text-sm text-emerald-400 flex items-center gap-1"><CheckCircle size={16} /> Synced to DB</span>}
            </h2>

            <div className="flex-1 overflow-y-auto mb-4 border border-white/5 bg-black/20 rounded-xl">
              {extractedData.length === 0 && !processing && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p>Awaiting scan results...</p>
                </div>
              )}

              {extractedData.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 sticky top-0">
                    <tr>
                      <th className="p-3 text-gray-400">Employee Match</th>
                      <th className="p-3 text-gray-400">In Time</th>
                      <th className="p-3 text-gray-400">Out Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.map((row) => (
                      <tr key={row.id} className="border-t border-white/5">
                        <td className="p-2">
                          <select
                            value={row.empId}
                            onChange={e => handleRowChange(row.id, 'empId', e.target.value)}
                            className="w-full bg-transparent border-none text-white focus:ring-1 focus:ring-purple-500 rounded px-2"
                          >
                            <option value="" className="bg-base text-gray-400">Not assigned</option>
                            {employees.map(emp => <option key={emp.id} value={emp.id} className="bg-base">{emp.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={row.inTime}
                            onChange={e => handleRowChange(row.id, 'inTime', e.target.value)}
                            className="bg-transparent border border-white/10 rounded w-full px-2"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={row.outTime}
                            onChange={e => handleRowChange(row.id, 'outTime', e.target.value)}
                            className="bg-transparent border border-white/10 rounded w-full px-2"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button
              onClick={handleSaveToDB}
              disabled={extractedData.length === 0 || saved}
              className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-colors"
            >
              Verify & Sync to Database
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
};
// Helper icon
const Scan = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /></svg>;

export default RegisterUpload;

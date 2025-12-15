import React, { useState, useRef } from 'react';
import { GridDimensions, CellValue } from '../types';
import { Camera, Upload, X, Loader2, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';
import { scanBingoCard, fileToGenerativePart } from '../services/geminiService';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (numbers: CellValue[][]) => void;
  dimensions: GridDimensions;
  centerFree: boolean;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose, onAdd, dimensions, centerFree }) => {
  const [mode, setMode] = useState<'manual' | 'scan'>('manual');
  const [gridData, setGridData] = useState<string[][]>([]);
  
  // Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Analyzing...");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize grid when opening or changing dimensions
  React.useEffect(() => {
    if (isOpen) {
      const initialGrid = Array.from({ length: dimensions.rows }, (_, r) => 
        Array.from({ length: dimensions.cols }, (_, c) => {
          // Pre-fill center if configured AND dimensions are odd
          const isCenterRow = dimensions.rows % 2 !== 0 && r === Math.floor(dimensions.rows/2);
          const isCenterCol = dimensions.cols % 2 !== 0 && c === Math.floor(dimensions.cols/2);
          
          return (isCenterRow && isCenterCol && centerFree) ? 'FREE' : '';
        })
      );
      setGridData(initialGrid);
      setMode('manual');
      setScanError(null);
      setPreviewUrl(null);
      setIsScanning(false);
    }
  }, [isOpen, dimensions, centerFree]);

  // Clean up preview URL
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newGrid = gridData.map(r => [...r]);
    newGrid[row][col] = value;
    setGridData(newGrid);
  };

  const handleSave = () => {
    // Validate and convert strings to numbers/null
    const processedGrid: CellValue[][] = [];
    
    for (let i = 0; i < dimensions.rows; i++) {
      const row: CellValue[] = [];
      for (let j = 0; j < dimensions.cols; j++) {
        const raw = gridData[i][j].trim().toUpperCase();
        if (raw === 'FREE' || raw === 'F' || raw === '') {
          row.push(null);
        } else {
          const num = parseInt(raw, 10);
          if (isNaN(num)) {
            alert(`Invalid number at Row ${i+1}, Col ${j+1}`);
            return;
          }
          row.push(num);
        }
      }
      processedGrid.push(row);
    }
    onAdd(processedGrid);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Setup preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setIsScanning(true);
    setScanError(null);
    setScanStatus("Uploading image...");

    // Setup abort controller (mock, as we check isScanning state)
    abortControllerRef.current = new AbortController();

    try {
      setScanStatus("Processing image...");
      const base64 = await fileToGenerativePart(file);
      
      if (!isScanning && previewUrl !== url) return; // Check if cancelled

      setScanStatus("Identifying numbers with AI...");
      const scannedNumbers = await scanBingoCard(base64, dimensions);
      
      // If user cancelled during await, abort update
      if (abortControllerRef.current?.signal.aborted) return;

      // Convert scan result to string grid for editing
      const stringGrid = scannedNumbers.map(row => 
        row.map(val => val === null ? 'FREE' : val.toString())
      );
      
      setGridData(stringGrid);
      setMode('manual'); // Switch to manual for review
    } catch (err: any) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error(err);
        setScanError(`Could not identify grid: ${err?.message ?? String(err)}. Ensure the photo is clear, well-lit, and contains only the Bingo card.`);
      }
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
    setScanError(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRetry = () => {
    setScanError(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#252525] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 slide-in-from-bottom-5">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#252525]">
          <h2 className="text-xl font-bold text-white tracking-tight">Add New Card <span className="text-xs text-zinc-500 ml-2 font-normal">({dimensions.rows}x{dimensions.cols})</span></h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors hover:rotate-90 duration-200">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-[#1f1f1f]">
          <button 
            onClick={() => { setMode('manual'); setPreviewUrl(null); setScanError(null); setIsScanning(false); }}
            disabled={isScanning}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${mode === 'manual' ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-300'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Manual Entry
            {mode === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 animate-in fade-in zoom-in-x duration-200"></div>}
          </button>
          <button 
            onClick={() => setMode('scan')}
            disabled={isScanning}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${mode === 'scan' ? 'text-purple-400 bg-purple-500/5' : 'text-zinc-500 hover:text-zinc-300'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Sparkles size={16} /> AI Scan
            {mode === 'scan' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 animate-in fade-in zoom-in-x duration-200"></div>}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#252525] relative">
          {mode === 'scan' ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
               
               {/* Initial State: No scanning, no error, no preview */}
               {!isScanning && !scanError && !previewUrl && (
                 <>
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-purple-400 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] animate-pulse">
                        <Camera size={36} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Snap or Upload</h3>
                            <p className="text-sm text-zinc-500">Take a clear photo of your {dimensions.rows}x{dimensions.cols} card.</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-[#323232] hover:bg-[#3f3f3f] border border-white/10 text-white py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg"
                    >
                        <Upload size={20} /> Select Image
                    </button>
                 </>
               )}

               {/* Scanning State */}
               {isScanning && (
                 <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-48 h-64 rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-900/50">
                        {previewUrl && (
                            <img src={previewUrl} alt="Scanning" className="w-full h-full object-cover opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent animate-scan h-[200%] w-full -top-1/2"></div>
                        <div className="absolute inset-0 border-2 border-purple-400/30 rounded-xl"></div>
                    </div>
                    
                    <div className="text-center space-y-2">
                         <div className="flex items-center justify-center gap-2 text-purple-300 font-medium">
                             <Loader2 size={18} className="animate-spin" />
                             {scanStatus}
                         </div>
                         <button 
                            onClick={handleCancelScan}
                            className="text-sm text-zinc-500 hover:text-white underline decoration-zinc-700 underline-offset-4 hover:decoration-white transition-all"
                         >
                            Cancel Scan
                         </button>
                    </div>
                 </div>
               )}
               
               {/* Error State */}
               {scanError && (
                 <div className="w-full flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 border border-red-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-2">Scan Failed</h3>
                        <p className="text-red-300/80 text-sm max-w-xs mx-auto">
                            {scanError}
                        </p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={handleRetry}
                            className="flex-1 bg-[#323232] hover:bg-[#3f3f3f] text-white py-3 rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors"
                        >
                            <RotateCcw size={16} /> Retry
                        </button>
                        <button 
                            onClick={() => { setMode('manual'); setScanError(null); }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-colors"
                        >
                            Enter Manually
                        </button>
                    </div>
                 </div>
               )}

               <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
               />
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-left-4 duration-300">
              <p className="text-sm text-zinc-500 mb-6 w-full text-center">
                Enter numbers below. Type '0' or 'FREE' for free space.
              </p>
              <div 
                className="grid gap-3 mb-8"
                style={{ gridTemplateColumns: `repeat(${dimensions.cols}, minmax(0, 1fr))` }}
              >
                {gridData.map((row, r) => (
                  row.map((val, c) => (
                    <input
                      key={`${r}-${c}`}
                      type="text"
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => handleCellChange(r, c, e.target.value)}
                      className={`
                        w-full aspect-square rounded-xl border text-center text-lg font-bold outline-none focus:ring-2 transition-all
                        ${val === 'FREE' 
                          ? 'bg-[#323232] border-zinc-700 text-zinc-500 text-xs' 
                          : 'bg-[#1f1f1f] border-[#323232] text-white focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-zinc-600'}
                      `}
                    />
                  ))
                ))}
              </div>
              <button
                onClick={handleSave}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:translate-y-[-2px] active:translate-y-0"
              >
                Add Card to Game
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AddCardModal;
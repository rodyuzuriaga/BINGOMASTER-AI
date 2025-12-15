import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, LayoutGrid, RotateCcw, Hash, Play, Grid3X3, Grid2X2, Settings2, Sparkles, Trash2, Edit3, Eraser, Undo2 } from 'lucide-react';
import { BingoCardData, GridDimensions, CellValue } from './types';
import BingoCard from './components/BingoCard';
import AddCardModal from './components/AddCardModal';

function App() {
  // Game Configuration State
  const [dimensions, setDimensions] = useState<GridDimensions>({ rows: 5, cols: 5 });
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [centerFree, setCenterFree] = useState(true);
  
  // Game Data State
  const [cards, setCards] = useState<BingoCardData[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
  const [currentInput, setCurrentInput] = useState('');
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [bingoCount, setBingoCount] = useState(0);

  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- Logic ---

  // Check if a card is a winner (supports rectangular grids)
  const checkWin = useCallback((numbers: CellValue[][], called: Set<number>): boolean => {
    const rows = numbers.length;
    const cols = numbers[0].length;
    const isMarked = (v: CellValue) => v === null || called.has(v);

    // Check Rows
    for (let r = 0; r < rows; r++) {
      if (numbers[r].every(isMarked)) return true;
    }

    // Check Cols
    for (let c = 0; c < cols; c++) {
      let colFull = true;
      for (let r = 0; r < rows; r++) {
        if (!isMarked(numbers[r][c])) { colFull = false; break; }
      }
      if (colFull) return true;
    }

    // Check Diagonals (Only if square)
    if (rows === cols) {
        let d1Full = true;
        let d2Full = true;
        for (let i = 0; i < rows; i++) {
            if (!isMarked(numbers[i][i])) d1Full = false;
            if (!isMarked(numbers[i][rows - 1 - i])) d2Full = false;
        }
        if (d1Full || d2Full) return true;
    }

    return false;
  }, []);

  // Update card statuses whenever calledNumbers changes
  useEffect(() => {
    let newBingoCount = 0;
    
    setCards(prev => prev.map(c => {
        let count = 0;
        c.numbers.forEach(row => row.forEach(n => {
            if (n === null || calledNumbers.has(n)) count++;
        }));
        
        const isWinner = checkWin(c.numbers, calledNumbers);
        if (isWinner) newBingoCount++;
        
        return { ...c, isWinner, markedCount: count };
    }));
    
    setBingoCount(newBingoCount);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calledNumbers, checkWin]); 


  const handleAddCard = (gridNumbers: CellValue[][]) => {
    const idCount = cards.length + 1;
    const newCard: BingoCardData = {
      id: `CARD-${Date.now()}`,
      title: `Card #${idCount}`, // Default title
      numbers: gridNumbers,
      isWinner: false,
      markedCount: 0
    };
    setCards(prev => [...prev, newCard]);
  };

  const handleCallNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(currentInput);
    
    if (isNaN(num)) return;
    if (calledNumbers.has(num)) {
        setLastNotification(`Number ${num} was already called!`);
        setCurrentInput('');
        return;
    }

    // Add to set
    const newSet = new Set(calledNumbers);
    newSet.add(num);
    setCalledNumbers(newSet);
    
    // Calculate stats for notification
    let affectedCount = 0;
    cards.forEach(card => {
        let hasNum = false;
        card.numbers.forEach(row => {
            if (row.includes(num)) hasNum = true;
        });
        if (hasNum) affectedCount++;
    });

    setLastNotification(`Number ${num} marked on ${affectedCount} cards!`);
    setCurrentInput('');
  };

  // UNDO LAST CALL - Removes the last entry
  const handleUndoLast = () => {
    const asArray = Array.from(calledNumbers);
    if (asArray.length === 0) return;

    const removed = asArray.pop(); // Remove last element
    setCalledNumbers(new Set(asArray));
    setLastNotification(`Undid number ${removed}`);
  };

  // FULL RESET - Deletes all cards
  const handleFullReset = () => {
    if (confirm("⚠️ DELETE ALL? This will remove all cards and restart the game.")) {
        setCards([]);
        setCalledNumbers(new Set());
        setBingoCount(0);
        setLastNotification(null);
    }
  };

  // CLEAR NUMBERS ONLY - Resets round
  const handleClearNumbers = () => {
    if (confirm("Restart Round? This will clear all called numbers but keep your cards.")) {
        // Just clear the set, useEffect will handle updating the cards to remove 'isWinner' etc.
        setCalledNumbers(new Set());
        setBingoCount(0);
        setLastNotification("Board cleared! Cards kept.");
    }
  };

  const deleteCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }
  
  const handleRenameCard = (id: string, newTitle: string) => {
      setCards(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  }

  const handlePresetSelect = (size: number) => {
      setDimensions({ rows: size, cols: size });
      setIsCustomSize(false);
  }

  const handleCustomToggle = () => {
      setIsCustomSize(true);
      // Default to 5x5 if switching to custom
      setDimensions({ rows: 5, cols: 5 });
  }

  // Derived state for last 5 calls
  const recentCalls = useMemo(() => {
    return Array.from(calledNumbers).reverse().slice(0, 5);
  }, [calledNumbers]);

  // Sort cards: Winners first, then by original order
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
        // Winners always on top
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;
        return 0; // Keep relative order otherwise
    });
  }, [cards]);

  return (
    <div className="min-h-screen bg-[#1f1f1f] pb-32 sm:pb-24 text-zinc-100 selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* Top Navbar */}
      <header className={`sticky top-0 z-50 border-b border-white/5 px-4 py-3 sm:py-4 transition-all duration-700 ${bingoCount > 0 ? 'animate-rainbow shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-[#1f1f1f]/80 backdrop-blur-md'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Logo */}
            <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-xl rotate-3 opacity-90 blur-sm group-hover:blur-md transition-all"></div>
                        <div className="absolute inset-0 bg-[#252525] rounded-xl -rotate-3 border border-white/10 flex items-center justify-center backdrop-blur-sm z-10">
                            <span className="font-black text-lg sm:text-xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">B</span>
                        </div>
                    </div>
                    <div className="leading-none">
                        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 drop-shadow-md">
                            BingoMaster
                        </h1>
                        <p className={`text-[10px] sm:text-[11px] font-medium tracking-wide mt-0.5 transition-colors ${bingoCount > 0 ? 'text-white/90' : 'text-zinc-500'}`}>
                            {bingoCount > 0 ? '🎉 WINNER DETECTED!' : 'AI TRACKING'}
                        </p>
                    </div>
                </div>
                
                {/* Mobile Stats Compact */}
                <div className="md:hidden flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                    <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-sm">{cards.length}</span>
                        <span>Cards</span>
                    </div>
                    <div className="w-px h-6 bg-white/10"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-white font-bold text-sm">{calledNumbers.size}</span>
                        <span>Called</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                {/* Stats Summary - Desktop */}
                <div className={`hidden md:flex items-center gap-4 text-xs font-medium border-r border-white/10 pr-6 ${bingoCount > 0 ? 'text-white/80' : 'text-zinc-500'}`}>
                   <div className="flex flex-col items-center">
                      <span className="text-white text-lg leading-none font-bold animate-in fade-in zoom-in key={cards.length}">{cards.length}</span>
                      <span>Active Cards</span>
                   </div>
                   <div className="flex flex-col items-center">
                      <span className="text-white text-lg leading-none font-bold animate-in fade-in zoom-in key={calledNumbers.size}">{calledNumbers.size}</span>
                      <span>Numbers Called</span>
                   </div>
                </div>

                {/* Calling Control */}
                <form onSubmit={handleCallNumber} className="flex gap-2 w-full">
                    <div className="relative flex-1 md:w-40 group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                             <Hash className="text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                        </div>
                        <input 
                            type="number"
                            placeholder="Next #"
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-[#252525] border border-[#323232] rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all shadow-xl"
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 active:shadow-none"
                    >
                        <Play size={16} className="fill-current" /> <span className="hidden sm:inline">Call</span>
                    </button>
                </form>
            </div>
        </div>
      </header>

      {/* Stats Bar / Last Called */}
      <div className="bg-[#252525] border-b border-white/5 px-4 py-2 relative z-40 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-sm min-w-max">
            <div className="flex items-center gap-3 text-zinc-500">
                <span className="uppercase text-[10px] font-bold tracking-widest flex items-center gap-1">
                    <RotateCcw size={10} /> History
                </span>
                <div className="flex gap-1.5">
                    {recentCalls.map((n, i) => (
                        <div 
                            key={`${n}-${i}`} 
                            className={`
                                w-8 h-8 flex items-center justify-center rounded-lg font-mono font-bold text-sm transition-all duration-500
                                ${i === 0 ? 'bg-white text-[#1f1f1f] shadow-lg shadow-white/10 scale-105 animate-pop' : 'bg-[#323232] text-zinc-400 border border-white/5'}
                            `}
                        >
                            {n}
                        </div>
                    ))}
                    {recentCalls.length === 0 && <span className="text-zinc-700 text-xs italic">Waiting for start...</span>}
                </div>
            </div>
            
            {lastNotification && (
                <div className="hidden sm:flex items-center gap-2 text-emerald-400 font-medium px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Sparkles size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
                    {lastNotification}
                </div>
            )}
            
            <div>
                 {bingoCount > 0 ? (
                     <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-200 px-3 py-1 rounded-full border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] animate-pulse">
                         <span className="font-bold text-lg">{bingoCount}</span>
                         <span className="text-xs font-bold tracking-wider uppercase">Winners</span>
                     </div>
                 ) : (
                     <div className="text-zinc-600 text-xs font-medium">No winners yet</div>
                 )}
            </div>
        </div>
      </div>

      {/* Configuration (Only show if no cards) */}
      {cards.length === 0 && (
          <div className="max-w-7xl mx-auto px-4 mt-8 sm:mt-12 relative z-10 animate-slide-up">
              <div className="bg-[#252525]/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/5 text-center max-w-xl mx-auto shadow-2xl">
                  <div className="w-12 h-12 bg-[#323232] rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                      <Settings2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Game Setup</h3>
                  <p className="text-zinc-500 text-sm mb-8">Configure your Bingo grid before adding players.</p>
                  
                  {/* Grid Selector */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                      {[3, 4, 5].map((size) => (
                        <button 
                            key={size}
                            onClick={() => handlePresetSelect(size)} 
                            className={`
                                py-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300
                                ${!isCustomSize && dimensions.rows === size && dimensions.cols === size
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] scale-105' 
                                    : 'bg-[#323232] border-transparent text-zinc-500 hover:bg-[#323232]/80 hover:border-white/10'}
                            `}
                        >
                            <span className="font-bold">{size}x{size}</span>
                        </button>
                      ))}
                      <button 
                         onClick={handleCustomToggle}
                         className={`
                            py-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300
                            ${isCustomSize
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)] scale-105' 
                                : 'bg-[#323232] border-transparent text-zinc-500 hover:bg-[#323232]/80 hover:border-white/10'}
                         `}
                      >
                         <Edit3 size={16} />
                         <span className="font-bold text-xs">Custom</span>
                      </button>
                  </div>

                  {/* Custom Inputs */}
                  {isCustomSize && (
                      <div className="flex gap-4 mb-8 bg-[#323232]/50 p-4 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                          <div className="flex-1">
                              <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase">Rows</label>
                              <input 
                                type="number" 
                                min="2" max="10" 
                                value={dimensions.rows}
                                onChange={(e) => setDimensions(prev => ({ ...prev, rows: Math.max(2, Math.min(10, parseInt(e.target.value) || 2)) }))}
                                className="w-full bg-[#1f1f1f] border border-white/10 rounded-lg py-2 px-3 text-white text-center font-bold focus:border-indigo-500 outline-none"
                              />
                          </div>
                          <div className="flex items-center text-zinc-600 font-bold">X</div>
                          <div className="flex-1">
                              <label className="block text-xs text-zinc-500 mb-1 font-bold uppercase">Columns</label>
                              <input 
                                type="number" 
                                min="2" max="10" 
                                value={dimensions.cols}
                                onChange={(e) => setDimensions(prev => ({ ...prev, cols: Math.max(2, Math.min(10, parseInt(e.target.value) || 2)) }))}
                                className="w-full bg-[#1f1f1f] border border-white/10 rounded-lg py-2 px-3 text-white text-center font-bold focus:border-indigo-500 outline-none"
                              />
                          </div>
                      </div>
                  )}
                  
                  <label className="flex items-center justify-between p-4 rounded-xl bg-[#323232]/50 border border-white/5 cursor-pointer hover:bg-[#323232] transition-colors">
                        <span className="text-zinc-300 font-medium">Free Space in Center</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={centerFree} 
                                onChange={(e) => setCenterFree(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </div>
                  </label>
              </div>
          </div>
      )}

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-8 relative z-10 min-h-[50vh]">
        {cards.length === 0 ? (
            <div className="text-center py-20 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner animate-float">
                    <LayoutGrid size={40} className="text-zinc-700" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Ready to play?</h2>
                <p className="text-zinc-500 max-w-md mx-auto">
                    Start by adding your physical Bingo cards manually or by scanning them with our AI.
                    <br/>
                    <span className="text-xs mt-2 inline-block opacity-70">Current Mode: {dimensions.rows}x{dimensions.cols}</span>
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 pb-20">
                {sortedCards.map((card, idx) => (
                    <BingoCard 
                        key={card.id} 
                        card={card} 
                        index={idx}
                        calledNumbers={calledNumbers} 
                        onDelete={deleteCard}
                        onRename={handleRenameCard}
                    />
                ))}
            </div>
        )}
      </main>

      {/* Floating Action Buttons - Fixed & Improved */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex flex-col items-end gap-3 sm:gap-4 z-[100] pointer-events-none">
        {cards.length > 0 && (
             <div className="flex flex-col gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-300 delay-100 pointer-events-auto items-end">
                
                {/* Undo Button */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-black/80 px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">Undo</span>
                    <button 
                        onClick={handleUndoLast}
                        disabled={calledNumbers.size === 0}
                        className="w-12 h-12 bg-[#252525] hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white rounded-full shadow-lg border border-white/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95 duration-200 group relative z-50"
                        title="Undo last number"
                        type="button"
                    >
                        <Undo2 size={20} />
                    </button>
                </div>

                {/* Restart Round (Eraser) */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-black/80 px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">Restart</span>
                    <button 
                        onClick={handleClearNumbers}
                        className="w-12 h-12 bg-[#252525] hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full shadow-lg border border-white/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95 duration-200 group relative z-50"
                        title="Restart Game (Clear Numbers)"
                        type="button"
                    >
                        <Eraser size={20} />
                    </button>
                </div>

                {/* Full Reset (Trash) */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold text-red-300 bg-black/80 px-2 py-1 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">Delete All</span>
                    <button 
                        onClick={handleFullReset}
                        className="w-12 h-12 bg-[#252525] hover:bg-red-900/20 text-zinc-400 hover:text-red-400 rounded-full shadow-lg border border-white/10 flex items-center justify-center transition-all hover:scale-110 active:rotate-180 duration-500 group relative z-50"
                        title="Delete All Cards"
                        type="button"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
             </div>
        )}
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="pointer-events-auto group flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white h-14 sm:h-16 px-6 sm:px-8 rounded-full shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:scale-105 hover:-translate-y-1 active:scale-95 animate-in slide-in-from-bottom-8 fade-in duration-500 relative z-50"
            type="button"
        >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300 sm:w-7 sm:h-7" />
            <span className="font-bold text-base sm:text-lg tracking-wide">Add Card</span>
        </button>
      </div>

      {/* Modals */}
      <AddCardModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCard}
        dimensions={dimensions}
        centerFree={centerFree}
      />

    </div>
  );
}

export default App;
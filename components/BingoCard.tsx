import React from 'react';
import { BingoCardData, CellValue } from '../types';
import { Trophy, CheckCircle2, Trash2, Edit2 } from 'lucide-react';

interface BingoCardProps {
  card: BingoCardData;
  calledNumbers: Set<number>;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  index?: number;
}

const BingoCard: React.FC<BingoCardProps> = ({ card, calledNumbers, onDelete, onRename, index = 0 }) => {
  const colCount = card.numbers[0].length; // Dynamic columns

  // Calculate if a cell is marked (either it's in calledNumbers OR it's null/FREE)
  const isMarked = (val: CellValue) => val === null || calledNumbers.has(val);

  // Glassmorphism base style
  const glassBase = "bg-[#252525]/80 backdrop-blur-xl border border-white/5 shadow-xl";
  
  const cardStyle = card.isWinner 
    ? `${glassBase} ring-2 ring-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]` 
    : `${glassBase} hover:border-white/10 hover:shadow-2xl hover:-translate-y-1`;

  return (
    <div 
      className={`relative rounded-3xl p-4 sm:p-5 transition-all duration-300 mt-6 ${cardStyle} animate-slide-up`}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Centered BINGO Badge - FLOATING ON TOP */}
      {card.isWinner && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-30 w-max pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-white font-black text-lg sm:text-xl tracking-widest px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce border-2 border-yellow-200">
             <Trophy size={20} strokeWidth={3} className="text-yellow-100" /> BINGO!
          </div>
        </div>
      )}

      {/* Header with Compact Editable Title */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5 relative z-10">
        <div className="flex-1 mr-2 relative">
             {onRename ? (
                 <div className="relative group">
                    <input 
                        type="text"
                        value={card.title || card.id}
                        onChange={(e) => onRename(card.id, e.target.value)}
                        className="w-full max-w-[140px] bg-transparent border-b border-transparent hover:border-white/10 focus:border-emerald-500 outline-none text-zinc-300 font-semibold text-sm truncate focus:bg-black/20 rounded-t px-1 transition-all"
                        placeholder="Name..."
                    />
                    <Edit2 size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-600 opacity-0 group-hover:opacity-100 pointer-events-none" />
                 </div>
             ) : (
                 <span className="text-xs font-mono text-zinc-500 tracking-wider">#{card.id.slice(-4)}</span>
             )}
        </div>

        <div className="flex items-center gap-2">
            <div className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 font-medium transition-all duration-500 ${card.markedCount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-600 bg-black/20'}`}>
                <CheckCircle2 size={10} className={card.markedCount > 0 ? "scale-110 text-emerald-400" : ""}/> 
                <span key={card.markedCount} className="animate-pop inline-block">{card.markedCount}</span>
            </div>
            {onDelete && (
            <button 
                onClick={() => onDelete(card.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-full active:scale-90"
                title="Delete Card"
            >
                <Trash2 size={14} />
            </button>
            )}
        </div>
      </div>

      {/* Grid */}
      <div 
        className="grid gap-1.5 sm:gap-2 relative z-10"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {card.numbers.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((num, colIndex) => {
              const marked = isMarked(num);
              
              let cellClass = "";
              let animationClass = "";
              
              if (marked) {
                // Marked state: glowing gradient + pop animation
                cellClass = card.isWinner 
                  ? "bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-[0_0_10px_rgba(234,179,8,0.4)] border-transparent scale-105" 
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] border-transparent";
                
                // Only animate pop if it's marked
                animationClass = "animate-pop";
              } else {
                // Unmarked: deep glass effect
                cellClass = "bg-[#323232]/50 text-zinc-400 border border-white/5 hover:bg-[#404040] hover:border-white/10 hover:text-zinc-200";
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg sm:rounded-xl 
                    text-sm sm:text-lg font-bold
                    transition-all duration-200 relative overflow-hidden group border ${cellClass} ${animationClass}
                  `}
                >
                  {/* Subtle shine effect on cells */}
                  {!marked && <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
                  
                  {num === null ? (
                    <span className={`text-[8px] sm:text-[10px] uppercase tracking-widest font-black ${marked ? 'opacity-90' : 'opacity-30'}`}>Free</span>
                  ) : (
                    <span className="relative z-10">{num}</span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default BingoCard;
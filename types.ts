
export interface GridDimensions {
  rows: number;
  cols: number;
}

// null represents a FREE space
export type CellValue = number | null;

export interface BingoCardData {
  id: string;
  title?: string; // User editable name
  numbers: CellValue[][]; // 2D array representing the grid
  isWinner: boolean;
  markedCount: number; // For stats
}

export interface GameSettings {
  dimensions: GridDimensions;
  centerFree: boolean;
}

export interface ScanResult {
  numbers: CellValue[][];
}

export type WinPattern = 'row' | 'col' | 'diag' | 'full';

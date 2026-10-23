// src/features/MaxBlock/utils/blocks.ts
// [2026-10-23] - FEATURE: Grundlegende Geometrie, Farben und Randomizer für MaxBlock (7-Bag-System).

export type BlockType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface BlockDefinition {
  shape: number[][];
  color: string; // Tailwind Klassen für den modernen Look
}

// Definition der klassischen Block-Formen in einem unsichtbaren Raster.
// Die Nullen sind leere Felder, die Einsen sind die sichtbaren Teile des Blocks.
// Die Matrizen sind quadratisch (außer O), um die Rotation um den eigenen Mittelpunkt zu vereinfachen.
export const BLOCKS: Record<BlockType, BlockDefinition> = {
  'I': {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 'bg-cyan-400 border-cyan-500 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  },
  'J': {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-blue-500 border-blue-600 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  },
  'L': {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-orange-500 border-orange-600 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  },
  'O': {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'bg-yellow-400 border-yellow-500 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  },
  'S': {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 'bg-emerald-500 border-emerald-600 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  },
  'T': {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-purple-500 border-purple-600 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  },
  'Z': {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-rose-500 border-rose-600 shadow-[inset_0_0_10px_rgba(255,255,255,0.4)]'
  }
};

/**
 * Mischt ein Array nach dem Fisher-Yates Algorithmus.
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Generiert einen neuen gemischten "Beutel" (Bag) mit allen 7 Block-Typen.
 * Dies garantiert, dass man nie zu lange auf einen bestimmten Block warten muss (7-Bag Randomizer).
 */
export function generateBlockBag(): BlockType[] {
  const types: BlockType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return shuffleArray(types);
}
// --- END OF FILE ---

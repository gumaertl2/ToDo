// 2026-05-12 14:10 - REFACTOR: Extraktion des Rechtsklick-Kontextmenüs aus AgendaItemRow.
// 2026-05-13 16:45 - CHIRURGISCHER EINGRIFF: Integration der Papierkorb-Aktionen (Wiederherstellen / Endgültig löschen).
// src/features/Shared/components/AgendaItem/RowContextMenu.tsx
import React from 'react';
import { 
  Edit2, Trash2, PlusCircle, CornerDownRight, ArrowLeftToLine, ArrowRightToLine, Eye, 
  ArchiveRestore, AlertTriangle // CHIRURGISCHER EINGRIFF: Neue Icons für den Papierkorb
} from 'lucide-react';

interface RowContextMenuProps {
  x: number;
  y: number;
  isExpanded: boolean;
  isReadOnly: boolean;
  isSubItem: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
  onToggleSubItem?: () => void;
  onInsertBelow?: (mode: 'sibling' | 'subitem') => void;
  onEdit: () => void;
  onDelete: () => void;
  
  // CHIRURGISCHER EINGRIFF: Neue Props für den Papierkorb
  isTrash?: boolean;
  onRestoreFromTrash?: () => void;
  onPermanentDelete?: () => void;
  canDeleteAnyItem?: boolean;
}

export const RowContextMenu: React.FC<RowContextMenuProps> = ({
  x, y, isExpanded, isReadOnly, isSubItem, onClose, 
  onToggleExpand, onToggleSubItem, onInsertBelow, onEdit, onDelete,
  isTrash, onRestoreFromTrash, onPermanentDelete, canDeleteAnyItem // CHIRURGISCHER EINGRIFF: Props destructuring
}) => {
  return (
    <div 
      className="fixed z-[100] bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 w-56 text-sm text-gray-700 font-medium print:hidden"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()} 
    >
      <button 
        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center gap-2.5 transition-colors" 
        onClick={() => { onToggleExpand(); onClose(); }}
      >
        <span className="font-mono font-bold w-4 text-center leading-none">{isExpanded ? '-' : '+'}</span>
        Notizen {isExpanded ? 'einklappen' : 'ausklappen'}
      </button>
      
      {(!isReadOnly && (onToggleSubItem || onInsertBelow)) && <div className="h-px bg-gray-200 my-1 mx-2" />}
      
      {!isReadOnly && onToggleSubItem && (
        <button 
          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2.5 transition-colors" 
          onClick={() => { onToggleSubItem(); onClose(); }}
        >
          {isSubItem ? <ArrowLeftToLine className="w-4 h-4 text-blue-500" /> : <ArrowRightToLine className="w-4 h-4 text-gray-500" />}
          {isSubItem ? 'Zum Hauptpunkt machen' : 'Zum Unterpunkt machen'}
        </button>
      )}
      
      {!isReadOnly && onInsertBelow && !isSubItem && (
         <button 
          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2.5 transition-colors" 
          onClick={() => { onInsertBelow('subitem'); onClose(); }}
         >
           <CornerDownRight className="w-4 h-4 text-blue-600" />
           Neuer Unterpunkt
         </button>
      )}
      
      {!isReadOnly && onInsertBelow && (
         <button 
          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors" 
          onClick={() => { onInsertBelow('sibling'); onClose(); }}
         >
           <PlusCircle className="w-4 h-4 text-emerald-600" />
           Neuer Punkt (daneben)
         </button>
      )}
      
      <div className="h-px bg-gray-200 my-1 mx-2" />
      
      <button 
        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2.5 transition-colors" 
        onClick={() => { onEdit(); onClose(); }}
      >
        {isReadOnly ? <Eye className="w-4 h-4 text-blue-500" /> : <Edit2 className="w-4 h-4 text-blue-500" />}
        {isReadOnly ? 'Details ansehen' : 'Details bearbeiten'}
      </button>
      
      {/* CHIRURGISCHER EINGRIFF: Soft-Delete (Papierkorb) */}
      {!isReadOnly && !isTrash && (
        <button 
          className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors" 
          onClick={() => { onDelete(); onClose(); }}
        >
          <Trash2 className="w-4 h-4" />
          In den Papierkorb
        </button>
      )}

      {/* CHIRURGISCHER EINGRIFF: Wiederherstellen & Endgültig Löschen */}
      {isTrash && onRestoreFromTrash && (
        <button 
          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-600 flex items-center gap-2.5 transition-colors" 
          onClick={() => { onRestoreFromTrash(); onClose(); }}
        >
          <ArchiveRestore className="w-4 h-4" />
          Wiederherstellen
        </button>
      )}
      
      {isTrash && onPermanentDelete && canDeleteAnyItem && (
        <button 
          className="w-full text-left px-4 py-2.5 hover:bg-red-100 text-red-700 font-bold flex items-center gap-2.5 transition-colors mt-1" 
          onClick={() => { onPermanentDelete(); onClose(); }}
        >
          <AlertTriangle className="w-4 h-4" />
          Endgültig löschen
        </button>
      )}
    </div>
  );
};
// --- END OF FILE ---
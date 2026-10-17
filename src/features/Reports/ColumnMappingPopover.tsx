// [2026-10-17] - FEATURE: Smart-Mapping Popover für den Data Explorer zur Übersetzung von IDs in Klarnamen.
// src/features/Reports/ColumnMappingPopover.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Link2Off } from 'lucide-react';

interface ColumnMappingPopoverProps {
  columnName: string;
  targetCollection: string;
  availableKeys: string[];
  currentDisplayKey: string | null;
  onSave: (displayKey: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const ColumnMappingPopover: React.FC<ColumnMappingPopoverProps> = ({
  columnName,
  targetCollection,
  availableKeys,
  currentDisplayKey,
  onSave,
  onRemove,
  onClose
}) => {
  const [selectedKey, setSelectedKey] = useState<string>(currentDisplayKey || (availableKeys.includes('name') ? 'name' : availableKeys.includes('title') ? 'title' : availableKeys[0] || 'id'));
  const popoverRef = useRef<HTMLDivElement>(null);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={popoverRef}
      className="absolute z-50 mt-2 p-4 bg-white border border-gray-200 shadow-xl rounded-xl w-64 animate-in fade-in zoom-in-95 duration-200"
      style={{ top: '100%', left: '0' }}
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gray-800">Spalten-Mapping</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Zeige statt ID dieses Feld:</label>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {availableKeys.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <p className="text-[10px] text-gray-400 mt-2 font-medium flex items-center">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
          Quelle: <span className="font-mono ml-1">{targetCollection}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={() => { onSave(selectedKey); onClose(); }}
          className="w-full flex items-center justify-center p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <Check className="w-4 h-4 mr-2" />
          Speichern
        </button>
        {currentDisplayKey && (
          <button 
            onClick={() => { onRemove(); onClose(); }}
            className="w-full flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-bold transition-colors border border-red-100 mt-1"
          >
            <Link2Off className="w-4 h-4 mr-2" />
            Mapping aufheben
          </button>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---
// 2026-04-18 20:30 - FIX: Lese-Sperre (disabled) für Rechteschutz eingebaut
// src/features/Users/components/EditableCell.tsx
import React, { useState } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (val: string) => void;
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
  className?: string;
  disabled?: boolean; // CHIRURGISCHER EINGRIFF: Neues Feld für Rechte-Schutz
}

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onSave, 
  type = 'text', 
  placeholder = '', 
  className = '',
  disabled = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    setIsFocused(false);
    if (tempVal !== value) onSave(tempVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setTempVal(value); setIsEditing(false); }
  };

  if (isEditing) {
    return (
      <input
        type={type === 'date' ? (isFocused || tempVal ? 'date' : 'text') : type}
        onFocus={() => setIsFocused(true)}
        autoFocus 
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full p-1 -m-1 text-sm border-2 border-blue-500 rounded bg-blue-50 outline-none ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => { if (!disabled) setIsEditing(true); }} 
      className={`min-h-[24px] ${disabled ? 'cursor-default' : 'cursor-text hover:bg-gray-100'} p-1 -m-1 rounded text-sm transition-colors ${!value ? 'text-gray-400 italic' : 'text-gray-900'} ${className}`}
    >
      {type === 'date' && value ? new Date(value).toLocaleDateString() : (value || placeholder)}
    </div>
  );
};
// --- END OF FILE ---
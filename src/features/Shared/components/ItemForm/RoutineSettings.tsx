// [2026-05-23] - REFACTOR: Datei geprüft. UI-Verriegelung für Unterpunkte wird nun direkt im Parent (ItemFormModal) gesteuert.
// 2026-05-12 13:30 - REFACTOR: Extraktion der Routine-Logik (Wiederholungen) aus ItemFormModal.
// src/features/Shared/components/ItemForm/RoutineSettings.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RoutineSettingsProps {
  routinePattern: 'none' | 'every_meeting' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  setRoutinePattern: (pattern: 'none' | 'every_meeting' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly') => void;
  routineEndDateStr: string;
  setRoutineEndDateStr: (date: string) => void;
  isReadOnly: boolean;
  todayStr: string;
}

export const RoutineSettings: React.FC<RoutineSettingsProps> = ({
  routinePattern,
  setRoutinePattern,
  routineEndDateStr,
  setRoutineEndDateStr,
  isReadOnly,
  todayStr
}) => {
  const isRoutine = routinePattern !== 'none';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div>
        <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center">
          <RefreshCw className="w-3 h-3 mr-1" /> Wiederholung
        </label>
        <select 
          value={routinePattern} 
          onChange={e => setRoutinePattern(e.target.value as any)} 
          disabled={isReadOnly} 
          className={`w-full p-1.5 text-sm border rounded font-medium disabled:opacity-80 focus:ring-indigo-500 ${
            isRoutine ? 'bg-indigo-50 text-indigo-900 border-indigo-300' : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          <option value="none">Nein (Einmalig)</option>
          <option value="every_meeting">Bei jeder Sitzung</option>
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
          <option value="quarterly">Quartalsweise</option>
          <option value="half_yearly">Halbjährlich</option>
          <option value="yearly">Jährlich</option>
        </select>
      </div>
      
      {isRoutine && (
        <div>
          <label className="block text-[10px] font-bold text-indigo-900 mb-1 truncate">
            Endet am / ohne Ende
          </label>
          <input 
            type="date" 
            min={todayStr} 
            value={routineEndDateStr} 
            onChange={e => setRoutineEndDateStr(e.target.value)} 
            disabled={isReadOnly} 
            className="w-full p-1.5 text-xs border border-indigo-300 rounded bg-indigo-50/50 text-indigo-900 focus:ring-indigo-500 disabled:opacity-80" 
          />
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---
// 2026-05-12 13:45 - REFACTOR: Extraktion der Inline-Editoren (Dauer, Datum, Routine) aus AgendaItemRow.
// 2026-05-12 17:15 - BUGFIX: TS6133 - Ungenutzten Import 'X' entfernt und 'onCancel' auf Escape-Taste gelegt.
// src/features/Shared/components/AgendaItem/InlineEditors.tsx
import React from 'react';
import { Minus, Plus, Check, RefreshCw } from 'lucide-react';

/**
 * 1. Popup zur schnellen Anpassung der Zeitdauer (Minuten)
 */
interface DurationPickerProps {
  localDur: number;
  onPreviewChange: (newVal: number) => void;
  onCancel: () => void;
  onCommit: () => void;
}

export const DurationPickerPopup: React.FC<DurationPickerProps> = ({ 
  localDur, onPreviewChange, onCancel, onCommit 
}) => (
  <>
    <div className="fixed inset-0 z-[50]" onClick={onCancel} />
    <div 
      className="absolute left-full top-[-20px] ml-4 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] p-4 origin-top-left print:hidden"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zeitfenster</h4>
        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Minuten</span>
      </div>

      <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-2 mb-4">
        <button onClick={() => onPreviewChange(localDur - 5)} className="w-10 h-10 flex items-center justify-center text-blue-600 bg-white rounded-lg shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"><Minus className="w-5 h-5" /></button>
        <span className="font-black text-blue-900 text-3xl font-mono">{localDur}</span>
        <button onClick={() => onPreviewChange(localDur + 5)} className="w-10 h-10 flex items-center justify-center text-blue-600 bg-white rounded-lg shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"><Plus className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {[5, 10, 15, 20].map(m => (
          <button key={m} onClick={() => onPreviewChange(m)} className={`py-1.5 text-xs font-bold rounded-lg transition-all border ${localDur === m ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-inner' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{m}</button>
        ))}
      </div>

      <div className="flex justify-between gap-2">
        <button onClick={onCancel} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg flex-1 transition-colors">Abbrechen</button>
        <button onClick={onCommit} className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex-1 flex items-center justify-center transition-colors"><Check className="w-3.5 h-3.5 mr-1" /> Speichern</button>
      </div>
    </div>
  </>
);

/**
 * 2. Inlines Datums-Eingabefeld
 */
interface InlineDateInputProps {
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  todayStr: string;
}

export const InlineDateInput: React.FC<InlineDateInputProps> = ({
  value, onChange, onSave, onCancel, todayStr
}) => (
  <input 
    type="date" 
    min={todayStr} 
    autoFocus 
    value={value} 
    onClick={e => e.stopPropagation()} 
    onChange={e => onChange(e.target.value)} 
    onBlur={onSave} 
    onKeyDown={e => { 
      if (e.key === 'Enter') onSave(); 
      if (e.key === 'Escape') onCancel(); 
    }} 
    className="w-24 text-xs border border-gray-300 rounded p-0.5 bg-white shadow-sm focus:ring-1 focus:ring-blue-500 outline-none" 
  />
);

/**
 * 3. Popup für Routine-Einstellungen
 */
interface RoutinePickerProps {
  pattern: string;
  onPatternChange: (val: any) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onCancel: () => void;
  onSave: () => void;
  todayStr: string;
}

export const RoutinePickerPopup: React.FC<RoutinePickerProps> = ({
  pattern, onPatternChange, endDate, onEndDateChange, onCancel, onSave, todayStr
}) => (
  <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 shadow-sm relative z-10 flex-1 flex-wrap md:flex-nowrap print:!hidden" onClick={e => e.stopPropagation()}> 
    <span className="text-xs font-bold text-indigo-800 flex items-center shrink-0">
      <RefreshCw className="w-3 h-3 mr-1" /> Routine:
    </span> 
    <select 
      value={pattern} 
      onChange={e => onPatternChange(e.target.value)} 
      className="w-full md:w-32 text-xs p-1 border border-indigo-300 rounded font-bold text-indigo-800 outline-none bg-white" 
    > 
      <option value="every_meeting">Bei jeder Sitzung</option> 
      <option value="weekly">Wöchentlich</option> 
      <option value="monthly">Monatlich</option> 
      <option value="quarterly">Quartalsweise</option> 
      <option value="half_yearly">Halbjährlich</option> 
      <option value="yearly">Jährlich</option> 
    </select> 
    <span className="text-xs text-indigo-800 ml-0 md:ml-2">Endet:</span> 
    <input 
      type="date" 
      min={todayStr} 
      value={endDate} 
      onChange={e => onEndDateChange(e.target.value)} 
      className="w-full md:w-32 text-xs p-1 border border-indigo-300 rounded text-indigo-800 outline-none bg-white" 
      title="Enddatum (Leer = ohne Ende)" 
    /> 
    <div className="flex gap-1 ml-auto w-full md:w-auto mt-2 md:mt-0"> 
      <button onClick={onCancel} className="px-3 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 py-1 font-medium flex-1 md:flex-none transition-colors">Abbrechen</button> 
      <button onClick={onSave} className="px-3 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 py-1 font-bold flex-1 md:flex-none transition-colors shadow-sm">Speichern</button> 
    </div> 
  </div>
);
// --- END OF FILE ---
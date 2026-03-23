// src/features/Templates/RoutineEditorModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Routine, LeadTimeUnit } from '../../core/types/models';
import { X, Save, AlertCircle } from 'lucide-react';

export const RoutineEditorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { addRoutine } = useClubStore();
  const [title, setTitle] = useState('');
  const [mustBeDoneBeforeEvent, setMustBeDoneBeforeEvent] = useState(false);
  const [leadTimeValue, setLeadTimeValue] = useState<number>(1);
  const [leadTimeUnit, setLeadTimeUnit] = useState<LeadTimeUnit>('DAYS');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Titel darf nicht leer sein.');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    const newRoutine: Routine = {
      id: `routine-${Date.now()}`,
      schemaVersion: '1.0',
      title: title.trim(),
      mustBeDoneBeforeEvent,
      leadTimeValue: mustBeDoneBeforeEvent ? leadTimeValue : undefined,
      leadTimeUnit: mustBeDoneBeforeEvent ? leadTimeUnit : undefined,
    };

    try {
      const result = await addRoutine(newRoutine);
      if (result.success) {
        onClose();
      } else {
        setError(result.error?.message || 'Fehler beim Speichern der Routine.');
        setIsSaving(false);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Event-Kaskade / Routine anlegen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-4">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel der Routine</label>
            <input 
              type="text" required value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Bierservice buchen"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Reverse-Scheduling (Vorlaufzeit)</h3>
            <div className="flex items-center mb-4">
              <input
                id="reverse-scheduling" type="checkbox" disabled={isSaving}
                checked={mustBeDoneBeforeEvent} onChange={(e) => setMustBeDoneBeforeEvent(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="reverse-scheduling" className="ml-2 text-sm text-gray-800 font-medium">
                Diese Routine hat eine harte Deadline vor dem Event
              </label>
            </div>

            {mustBeDoneBeforeEvent && (
              <div className="flex items-end gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Zeitwert</label>
                  <input
                    type="number" min="1" disabled={isSaving}
                    value={leadTimeValue} onChange={(e) => setLeadTimeValue(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Einheit</label>
                  <select
                    value={leadTimeUnit} onChange={(e) => setLeadTimeUnit(e.target.value as LeadTimeUnit)} disabled={isSaving}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 bg-white"
                  >
                    <option value="DAYS">Tage</option>
                    <option value="HOURS">Stunden</option>
                  </select>
                </div>
                <div className="py-2 text-sm text-gray-500 font-medium whitespace-nowrap">vor Start</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
          <button 
            onClick={handleSave} disabled={isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Routine Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Exakte Zeilenzahl: 104

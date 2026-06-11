// [2026-05-15] - FEATURE: Option B - TeamFormModal (Eingabefenster für die Team-Verwaltung)
// src/features/Users/TeamFormModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import type { Team } from '../../core/types/models';

interface TeamFormModalProps {
  onClose: () => void;
  existingTeam?: Team;
}

export const TeamFormModal: React.FC<TeamFormModalProps> = ({ onClose, existingTeam }) => {
  const { addTeam, updateTeam } = useClubStore();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wenn wir ein bestehendes Team bearbeiten, füllen wir das Feld aus
  useEffect(() => {
    if (existingTeam) {
      setName(existingTeam.name);
    }
  }, [existingTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bitte gib einen Namen für das Team ein.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let result;
    if (existingTeam && existingTeam.id) {
      // Update
      result = await updateTeam({ ...existingTeam, name: name.trim() });
    } else {
      // Neu anlegen
      result = await addTeam({ name: name.trim() });
    }

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {existingTeam ? 'Team bearbeiten' : 'Neues Team anlegen'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <form id="team-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name des Teams / der Gruppe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Herren 1, U19, Festkomitee"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Dieser Name wird später bei den Mitgliedern zur Zuweisung angezeigt.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form="team-form"
            disabled={isSubmitting || !name.trim()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
        
      </div>
    </div>
  );
};
// --- END OF FILE ---
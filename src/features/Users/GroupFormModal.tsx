// src/features/Users/GroupFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Group } from '../../core/types/models';
import { X, Save, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  existingGroup?: Group;
}

export const GroupFormModal: React.FC<Props> = ({ onClose, existingGroup }) => {
  const { createGroup, updateGroup } = useClubStore();
  const [name, setName] = useState(existingGroup?.name || '');
  const [description, setDescription] = useState(existingGroup?.description || '');
  const [color, setColor] = useState(existingGroup?.color || '#3b82f6'); // CHIRURGISCHER EINGRIFF: Standard-Blau
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name darf nicht leer sein.');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    const groupData: Group = {
      id: existingGroup?.id || `group-${Date.now()}`,
      schemaVersion: '1.0',
      name: name.trim(),
      description: description.trim(),
      color: color, // CHIRURGISCHER EINGRIFF: Farbe in die Firebase übergeben
    };

    try {
      const result = existingGroup 
        ? await updateGroup(groupData)
        : await createGroup(groupData);
        
      if (result.success) {
        onClose();
      } else {
        setError(result.error?.message || 'Fehler beim Speichern der Rolle.');
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
          <h2 className="text-xl font-bold text-gray-900">{existingGroup ? 'Rolle bearbeiten' : 'Neue Rolle anlegen'}</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Name der Rolle (z.B. Kassenwart, Festausschuss)</label>
            <input 
              type="text" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea 
              rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* CHIRURGISCHER EINGRIFF: Farbauswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farbe für Kalender</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={isSaving}
                className="w-12 h-10 p-1 border border-gray-300 rounded cursor-pointer bg-white"
              />
              <span className="text-sm text-gray-500 font-mono uppercase">{color}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
          <button 
            onClick={handleSave} disabled={isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 111
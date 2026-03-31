// src/features/Users/HelperFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Helper } from '../../core/types/models';
import { X, Save, AlertTriangle } from 'lucide-react';

interface HelperFormModalProps {
  onClose: () => void;
  existingHelper?: Helper;
}

export const HelperFormModal: React.FC<HelperFormModalProps> = ({ onClose, existingHelper }) => {
  const { addHelper, updateHelper } = useClubStore();
  const [name, setName] = useState(existingHelper?.name || '');
  const [bezug, setBezug] = useState(existingHelper?.bezug || '');
  const [email, setEmail] = useState(existingHelper?.email || '');
  const [telefon, setTelefon] = useState(existingHelper?.telefon || '');
  const [consentConfirmed, setConsentConfirmed] = useState(existingHelper?.consentConfirmed || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!consentConfirmed) return;
    
    setIsSaving(true);
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    
    const helperData: Helper = {
      ...existingHelper,
      id: existingHelper?.id || `helper-${now}`,
      schemaVersion: existingHelper?.schemaVersion || '1.0',
      name,
      bezug,
      email,
      telefon,
      consentConfirmed,
      lastActivityAt: existingHelper?.lastActivityAt || now,
      retentionExpiresAt: existingHelper?.retentionExpiresAt || (now + oneYear),
    };

    if (existingHelper) {
      await updateHelper(helperData);
    } else {
      await addHelper(helperData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{existingHelper ? 'Helfer bearbeiten' : 'Neuen Helfer anlegen'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              type="text" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bezug (z.B. Vater von...)</label>
            <input 
              type="text" required value={bezug} onChange={(e) => setBezug(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail (optional)</label>
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon (optional)</label>
            <input 
              type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} disabled={isSaving}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">DSGVO Pflichtfeld</h4>
                <div className="mt-2 flex items-center">
                  <input
                    id="consent" type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} disabled={isSaving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="consent" className="ml-2 text-sm text-yellow-900 block">
                    Person wurde über Speicherung informiert
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
          <button 
            onClick={handleSave}
            disabled={!consentConfirmed || !name || !bezug || isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Exakte Zeilenzahl: 122

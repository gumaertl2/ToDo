// 2026-04-13 19:47 - FIX: Stabile Datumseingabe via Focus-Switch
// src/features/Users/HelperFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Helper } from '../../core/types/models';
import { X, Save, AlertTriangle, AlertCircle } from 'lucide-react';

interface HelperFormModalProps {
  onClose: () => void;
  existingHelper?: Helper;
}

export const HelperFormModal: React.FC<HelperFormModalProps> = ({ onClose, existingHelper }) => {
  const { addHelper, updateHelper, helpers } = useClubStore();
  const [name, setName] = useState(existingHelper?.name || '');
  const [alias, setAlias] = useState(existingHelper?.alias || '');
  const [bezug, setBezug] = useState(existingHelper?.bezug || '');
  const [email, setEmail] = useState(existingHelper?.email || '');
  const [telefon, setTelefon] = useState(existingHelper?.telefon || '');
  const [geburtsdatum, setGeburtsdatum] = useState(existingHelper?.geburtsdatum || '');
  const [consentConfirmed, setConsentConfirmed] = useState(existingHelper?.consentConfirmed || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDateFocused, setIsDateFocused] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [aliasModified, setAliasModified] = useState(!!existingHelper);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!aliasModified && !existingHelper) {
      setAlias(val.trim().split(' ')[0]);
    }
  };

  const handleAliasChange = (val: string) => {
    setAlias(val);
    setAliasModified(true);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    if (!consentConfirmed || !name.trim() || !alias.trim()) return;
    
    const isDuplicate = helpers.some(h => 
      h.id !== existingHelper?.id && 
      h.alias.toLowerCase() === alias.trim().toLowerCase()
    );

    if (isDuplicate) {
      setError(`Der Alias "${alias.trim()}" wird bereits verwendet. Bitte wähle einen eindeutigen Namen.`);
      return;
    }

    setIsSaving(true);
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    
    let formattedName = name.trim();
    if (formattedName.includes(',')) {
      const parts = formattedName.split(',');
      if (parts.length === 2) {
        formattedName = `${parts[1].trim()} ${parts[0].trim()}`;
      }
    }
    
    // CHIRURGISCHER EINGRIFF: Der Nummern-Sanitäter (WhatsApp-Ready)
    let formattedPhone = telefon.trim().replace(/[^0-9+]/g, '');
    if (formattedPhone) {
      if (formattedPhone.startsWith('00')) {
        formattedPhone = '+' + formattedPhone.substring(2);
      } else if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('00')) {
        formattedPhone = '+49' + formattedPhone.substring(1);
      }
    }
    
    const rawHelperData: any = {
      ...existingHelper,
      id: existingHelper?.id || `helper-${now}`,
      schemaVersion: '1.0',
      name: formattedName,
      alias: alias.trim(),
      bezug: bezug.trim(),
      email: email.trim(),
      telefon: formattedPhone,
      geburtsdatum: geburtsdatum || undefined,
      consentConfirmed,
      lastActivityAt: existingHelper?.lastActivityAt || now,
      retentionExpiresAt: existingHelper?.retentionExpiresAt || (now + oneYear),
    };

    const safeHelperData = Object.fromEntries(Object.entries(rawHelperData).filter(([_, v]) => v !== undefined)) as Helper;

    if (existingHelper) {
      await updateHelper(safeHelperData);
    } else {
      await addHelper(safeHelperData);
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
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-2 border border-red-200">
               <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
               <span className="text-sm font-bold">{error}</span>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input 
              type="text" required value={name} onChange={(e) => handleNameChange(e.target.value)} disabled={isSaving}
              placeholder="z.B. Max Mustermann (Vorname Nachname)"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
            />
            <p className="text-xs text-red-500 mt-1">Bitte immer zuerst Vorname, dann Nachname (ohne Komma).</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alias (Muss eindeutig sein) *</label>
            <input 
              type="text" required value={alias} onChange={(e) => handleAliasChange(e.target.value)} disabled={isSaving}
              placeholder="z.B. Max"
              className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
            />
            <p className="text-xs text-gray-500 mt-1">Wird automatisch vorgeschlagen, kann aber geändert werden.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Freitext (optional)</label>
            <input 
              type="text" value={bezug} onChange={(e) => setBezug(e.target.value)} disabled={isSaving}
              placeholder="z.B. Notizen..."
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="0170 123456"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum (optional)</label>
            <input 
              type={isDateFocused || geburtsdatum ? "date" : "text"}
              onFocus={() => setIsDateFocused(true)}
              onBlur={() => setIsDateFocused(false)}
              value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)} disabled={isSaving}
              placeholder="TT.MM.JJJJ"
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
                  <label htmlFor="consent" className="ml-2 text-sm text-yellow-900 block cursor-pointer">
                    Person wurde über Speicherung informiert
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition">Abbrechen</button>
          <button 
            onClick={handleSave}
            disabled={!consentConfirmed || !name.trim() || !alias.trim() || isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 178 Zeilen ---
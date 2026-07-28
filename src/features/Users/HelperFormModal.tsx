// [2026-07-28] - TS-FIX: Ungenutzten Import 'FileSignature' entfernt (TS6133).
// [2026-07-28] - UX-FEATURE: Aktenlage (DSGVO-Papier & Jugendarbeit) vom App-Sichtbarkeitsschalter getrennt eingebaut. Automatisches Opt-In bei Papiereingang.
// [2026-07-22] - BUGFIX: DSGVO Reset-Button für den Admin hinzugefügt, um Verweigerer (oder alte Zustimmungen) zurückzusetzen und eine Neuabfrage zu erzwingen.
// 2026-04-16 16:40 - FEATURE: Eingabefelder für Eintrittsdatum und Mitgliedsstatus hinzugefügt
// 2026-04-23 15:30 - FEATURE: Eingabefeld für Tel. Eltern hinzugefügt
// 2026-04-30 18:20 - FEATURE: Eingabefeld für E-Mail (Eltern) hinzugefügt
// src/features/Users/HelperFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Helper } from '../../core/types/models';
import { X, Save, AlertTriangle, AlertCircle, ShieldCheck, RefreshCw, FolderOpen } from 'lucide-react';
import { DSGVO_CONFIG } from '../../config/dsgvoConfig';

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
  const [telefonEltern, setTelefonEltern] = useState(existingHelper?.telefonEltern || '');
  const [emailEltern, setEmailEltern] = useState(existingHelper?.emailEltern || '');
  const [geburtsdatum, setGeburtsdatum] = useState(existingHelper?.geburtsdatum || '');
  
  const [eintrittsdatum, setEintrittsdatum] = useState(existingHelper?.eintrittsdatum || '');
  const [memberStatus, setMemberStatus] = useState<'AKTIV' | 'PASSIV' | 'JUGEND'>(existingHelper?.memberStatus || 'AKTIV');

  const [hasWrittenDsgvoConsent, setHasWrittenDsgvoConsent] = useState(existingHelper?.hasWrittenDsgvoConsent || false);
  const [hasYouthWorkClearance, setHasYouthWorkClearance] = useState(existingHelper?.hasYouthWorkClearance || false);

  const [consentConfirmed, setConsentConfirmed] = useState(existingHelper?.consentConfirmed || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDateFocused, setIsDateFocused] = useState(false);
  const [isEintrittFocused, setIsEintrittFocused] = useState(false);
  
  const [forceResetConsent, setForceResetConsent] = useState(false);
  
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
    if (!name.trim() || !alias.trim()) return; 
    
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
    
    let formattedPhone = telefon.trim().replace(/[^0-9+]/g, '');
    if (formattedPhone) {
      if (formattedPhone.startsWith('00')) {
        formattedPhone = '+' + formattedPhone.substring(2);
      } else if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('00')) {
        formattedPhone = '+49' + formattedPhone.substring(1);
      }
    }

    let formattedPhoneEltern = telefonEltern.trim().replace(/[^0-9+]/g, '');
    if (formattedPhoneEltern) {
      if (formattedPhoneEltern.startsWith('00')) {
        formattedPhoneEltern = '+' + formattedPhoneEltern.substring(2);
      } else if (formattedPhoneEltern.startsWith('0') && !formattedPhoneEltern.startsWith('00')) {
        formattedPhoneEltern = '+49' + formattedPhoneEltern.substring(1);
      }
    }
    
    const adminChangedConsent = existingHelper ? (consentConfirmed !== existingHelper.consentConfirmed) : consentConfirmed;

    let newDsgvoVersion = existingHelper?.dsgvoConsentVersion;
    let newConsentAt = existingHelper?.consentConfirmedAt;
    let newConsentBy = existingHelper?.consentConfirmedBy;

    if (forceResetConsent) {
      newDsgvoVersion = undefined;
      newConsentAt = undefined;
      newConsentBy = undefined;
    } else if (adminChangedConsent) {
      if (consentConfirmed) {
        newDsgvoVersion = DSGVO_CONFIG.version;
        newConsentAt = now;
        newConsentBy = 'ADMIN';
      } else {
        newDsgvoVersion = undefined;
        newConsentAt = undefined;
        newConsentBy = undefined;
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
      telefonEltern: formattedPhoneEltern,
      emailEltern: emailEltern.trim(),
      geburtsdatum: geburtsdatum || undefined,
      eintrittsdatum: eintrittsdatum || undefined,
      memberStatus,
      
      hasWrittenDsgvoConsent,
      hasYouthWorkClearance,

      consentConfirmed,
      dsgvoConsentVersion: newDsgvoVersion,
      consentConfirmedAt: newConsentAt,
      consentConfirmedBy: newConsentBy,

      lastActivityAt: existingHelper?.lastActivityAt || now,
      retentionExpiresAt: existingHelper?.retentionExpiresAt || (now + oneYear),
    };

    const safeHelperData = Object.fromEntries(Object.entries(rawHelperData).filter(([_, v]) => v !== undefined)) as unknown as Helper;

    if (existingHelper) {
      await updateHelper(safeHelperData);
    } else {
      await addHelper(safeHelperData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{existingHelper ? 'Mitglied / Helfer bearbeiten' : 'Neues Mitglied / Helfer anlegen'}</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input 
                type="text" required value={name} onChange={(e) => handleNameChange(e.target.value)} disabled={isSaving}
                placeholder="Vorname Nachname"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={memberStatus} 
                onChange={(e) => setMemberStatus(e.target.value as 'AKTIV' | 'PASSIV' | 'JUGEND')}
                disabled={isSaving}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="AKTIV">Aktiv</option>
                <option value="PASSIV">Passiv</option>
                <option value="JUGEND">Jugend</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alias (Muss eindeutig sein) *</label>
            <input 
              type="text" required value={alias} onChange={(e) => handleAliasChange(e.target.value)} disabled={isSaving}
              placeholder="z.B. Max"
              className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
            />
            <p className="text-[10px] text-gray-500 mt-1">Wird für kurze Dienstpläne und Kalendereinträge genutzt.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Freitext (optional)</label>
            <input 
              type="text" value={bezug} onChange={(e) => setBezug(e.target.value)} disabled={isSaving}
              placeholder="z.B. Trainer, Elternteil von..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail Eltern (optional)</label>
              <input 
                type="email" value={emailEltern} onChange={(e) => setEmailEltern(e.target.value)} disabled={isSaving}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tel. Eltern (optional)</label>
              <input 
                type="tel" value={telefonEltern} onChange={(e) => setTelefonEltern(e.target.value)} disabled={isSaving}
                placeholder="0170 123456"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
              <input 
                type={isDateFocused || geburtsdatum ? "date" : "text"}
                onFocus={() => setIsDateFocused(true)}
                onBlur={() => setIsDateFocused(false)}
                value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)} disabled={isSaving}
                placeholder="TT.MM.JJJJ"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eintrittsdatum</label>
              <input 
                type={isEintrittFocused || eintrittsdatum ? "date" : "text"}
                onFocus={() => setIsEintrittFocused(true)}
                onBlur={() => setIsEintrittFocused(false)}
                value={eintrittsdatum} onChange={(e) => setEintrittsdatum(e.target.value)} disabled={isSaving}
                placeholder="TT.MM.JJJJ"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white" 
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6">
            <div className="flex items-start">
              <FolderOpen className="w-5 h-5 text-slate-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">Aktenlage & Dokumente (Vereinsverwaltung)</h4>
                
                <div className="mt-3 flex items-center">
                  <input
                    id="paper-consent" type="checkbox" checked={hasWrittenDsgvoConsent} 
                    onChange={(e) => {
                      setHasWrittenDsgvoConsent(e.target.checked);
                      if (e.target.checked) setConsentConfirmed(true);
                    }} 
                    disabled={isSaving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="paper-consent" className="ml-2 text-sm text-slate-800 font-medium cursor-pointer">
                    Schriftliche DSGVO-Erklärung liegt im Ordner vor
                  </label>
                </div>
                
                <div className="mt-3 flex items-center">
                  <input
                    id="youth-clearance" type="checkbox" checked={hasYouthWorkClearance} 
                    onChange={(e) => setHasYouthWorkClearance(e.target.checked)} disabled={isSaving}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="youth-clearance" className="ml-2 text-sm text-slate-800 font-medium cursor-pointer">
                    Unbedenklichkeitsbescheinigung (Jugendarbeit) liegt vor
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-blue-900">App-Einstellungen des Nutzers</h4>
                
                {forceResetConsent ? (
                  <div className="mt-3 p-3 rounded border border-orange-200 bg-orange-50 text-orange-800 text-sm font-bold flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
                    Der Sichtbarkeits-Status wird beim Speichern gelöscht.
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex items-center">
                      <input
                        id="consent" type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} disabled={isSaving}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="consent" className="ml-2 text-sm text-blue-900 font-medium block cursor-pointer">
                        Daten im Adressbuch der App sichtbar machen
                      </label>
                    </div>
                    
                    {existingHelper?.consentConfirmedAt && (
                      <div className={`mt-3 p-2.5 rounded border text-xs ${existingHelper.consentConfirmed ? 'bg-white/60 border-blue-100 text-blue-800' : 'bg-red-50/60 border-red-100 text-red-800'}`}>
                        <span className="font-bold">Nachweis der Freigabe:</span><br/>
                        {existingHelper.consentConfirmed ? 'Zustimmung erteilt' : 'Aktiv ABGELEHNT'} am {new Date(existingHelper.consentConfirmedAt).toLocaleDateString('de-DE')} um {new Date(existingHelper.consentConfirmedAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})} Uhr<br/>
                        <span className="italic">Protokolliert durch: {existingHelper.consentConfirmedBy === 'ADMIN' ? 'Administrator (Manuell)' : 'Nutzer selbst (Digital)'}</span>
                        
                        <div className="mt-2 pt-2 border-t border-black/10">
                          <button 
                            type="button" 
                            onClick={() => { setConsentConfirmed(false); setForceResetConsent(true); }} 
                            className={`flex items-center font-bold transition-colors ${existingHelper.consentConfirmed ? 'text-blue-600 hover:text-blue-800' : 'text-red-700 hover:text-red-900'}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Freigabe-Status zurücksetzen (Neuabfrage)
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition">Abbrechen</button>
          <button 
            onClick={handleSave}
            disabled={!name.trim() || !alias.trim() || isSaving}
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
// --- END OF FILE ---
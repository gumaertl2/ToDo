// [2026-10-08] - SEC-FIX: Rechteprüfung für 'Name ändern' robuster gemacht. Nutzt nun auch roleProfiles aus dem Store und erlaubt Umbenennung bei Neuanlage.
// [2026-10-08] - SEC-FEATURE: Feld "Name" im TeamFormModal für Mannschaftsführer gesperrt (Role-Based Access). Nur Admins dürfen umbenennen.
// [2026-09-30] - UX-FIX: Standard-Vorschlagstext für 'lineupLockMessage' auf den exakten, ausführlichen Best-Practice-Satz des Vereins aktualisiert.
// [2026-09-30] - FEATURE: 'lineupFreezeLeadDays' und 'lineupLockMessage' Konfigurationsfelder für Captains integriert.
// [2026-05-15] - FEATURE: Option B - TeamFormModal (Eingabefenster für die Team-Verwaltung)
// src/features/Users/TeamFormModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Lock, MessageCircle } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import type { Team } from '../../core/types/models';

interface TeamFormModalProps {
  onClose: () => void;
  existingTeam?: Team;
}

export const TeamFormModal: React.FC<TeamFormModalProps> = ({ onClose, existingTeam }) => {
  const { addTeam, updateTeam, user, roleProfiles } = useClubStore();
  
  // Saubere Rechteprüfung: Direktes User-Recht ODER Profil-Recht aus der RBAC-Matrix ODER Fallback auf Rollen-Namen
  const userProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const hasMitgliederRecht = 
    user?.permissions?.manageMitglieder === true || 
    userProfile?.permissions?.manageMitglieder === true ||
    user?.rolle?.toUpperCase() === 'ADMIN' || 
    user?.rolle?.toUpperCase() === 'VORSTAND';

  // Logik: Name darf bearbeitet werden, wenn es ein neues Team ist ODER der Nutzer die Rechte hat
  const isNewTeam = !existingTeam;
  const canEditName = isNewTeam || hasMitgliederRecht;

  const [name, setName] = useState('');
  
  // Konfigurations-Felder für den Auto-Freeze inkl. Best-Practice Standardwert
  const [freezeDays, setFreezeDays] = useState<number>(7);
  const [lockMessage, setLockMessage] = useState("🔒 Du bist für dieses Spiel fest aufgestellt und die Planung ist bereits versiegelt! Bei kurzfristigen Ausfällen kontaktiere bitte sofort deinen Mannschaftsführer und sag ihm wer für Dich spielt. Tipp: Schau hier in der Matrix nach, wer an dem Tag 'grün' (verfügbar) ist und kläre es ab!");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wenn wir ein bestehendes Team bearbeiten, füllen wir die Felder aus
  useEffect(() => {
    if (existingTeam) {
      setName(existingTeam.name);
      if (existingTeam.lineupFreezeLeadDays !== undefined) setFreezeDays(existingTeam.lineupFreezeLeadDays);
      if (existingTeam.lineupLockMessage !== undefined) setLockMessage(existingTeam.lineupLockMessage);
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
      result = await updateTeam({ 
        ...existingTeam, 
        name: name.trim(),
        lineupFreezeLeadDays: freezeDays,
        lineupLockMessage: lockMessage.trim()
      });
    } else {
      // Neu anlegen
      result = await addTeam({ 
        name: name.trim(),
        lineupFreezeLeadDays: freezeDays,
        lineupLockMessage: lockMessage.trim()
      });
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
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 shrink-0 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {existingTeam ? 'Team-Einstellungen' : 'Neues Team anlegen'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-full transition bg-white border border-gray-200 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 font-bold">
              {error}
            </div>
          )}

          <form id="team-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basis-Daten */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Name des Teams / der Gruppe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Herren 1, U19, Festkomitee"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
                autoFocus={canEditName}
                required
                disabled={!canEditName}
              />
              <p className="mt-1 text-xs text-gray-500">
                Dieser Name wird später bei den Mitgliedern zur Zuweisung angezeigt.
              </p>
            </div>

            {/* NEU: Aufstellungs-Regeln */}
            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-4">
              <h3 className="font-bold text-indigo-900 text-sm flex items-center border-b border-indigo-100 pb-2">
                <Lock className="w-4 h-4 mr-2 text-indigo-500" /> Regeln für die Aufstellungsplanung
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Automatischer Planungs-Stopp (Freeze)
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={freezeDays}
                    onChange={(e) => setFreezeDays(Number(e.target.value))}
                    className="w-20 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold"
                  />
                  <span className="ml-2 text-sm text-gray-600 font-medium">Tage vor Spielbeginn</span>
                </div>
                <p className="mt-1.5 text-[10px] text-gray-500 leading-tight">
                  Ab diesem Stichtag ist das Spiel für fest eingeteilte Spieler "versiegelt". Kurzfristige Ausfälle erfordern dann zwingend eine persönliche Meldung beim Captain. Setzen Sie den Wert auf 0, um den Auto-Freeze zu deaktivieren.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> Eigener Hinweis bei kurzfristigen Absagen
                </label>
                <textarea
                  value={lockMessage}
                  onChange={(e) => setLockMessage(e.target.value)}
                  placeholder="z.B.: Bitte ruft mich im Notfall direkt unter 017... an!"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows={5}
                />
                <p className="mt-1 text-[10px] text-gray-500 leading-tight">
                  Dieser Text wird nominierten Spielern in einem Dialog-Fenster angezeigt, wenn sie versuchen, eine bereits versiegelte Aufstellung (Zelle mit Schloss-Symbol) über die App abzusagen.
                </p>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-bold transition shadow-sm"
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form="team-form"
            disabled={isSubmitting || !name.trim()}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition shadow-sm disabled:opacity-50"
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
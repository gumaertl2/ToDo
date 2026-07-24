// [2026-07-24] - UX-FEATURE: "App reparieren" (Hard Reset) Button im Profil hinzugefügt, um Service Worker und Caches bei Update-Problemen hart zurückzusetzen.
// [2026-07-23] - FEATURE: DSGVO Self-Service für Nutzer integriert. Erlaubt die eigenständige Änderung von Kontaktdaten und DSGVO-Einwilligung.
// [2026-07-23] - SEC-FIX: Primäres E-Mail-Feld gesperrt (Read-Only), um die "Einladungs-Brücke" zum Firebase-Login nicht zu zerstören.
// [2026-07-23] - FEATURE: Auto-Benachrichtigung an Vorstände bei Stammdaten-Änderungen über das In-App Erinnerungssystem.
// [2026-07-23] - FEATURE: Eintrittsdatum zu den schreibgeschützten Stammdaten hinzugefügt (Art. 15 DSGVO Transparenz).
// [2026-07-23] - UX-FIX: Checkbox-Label für DSGVO statisch gemacht und Status-Badge hinzugefügt ("Schrödingers Checkbox" behoben).
// src/features/Users/MyProfileModal.tsx
import React, { useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, Save, ShieldCheck, AlertCircle, Info, Lock, RefreshCw } from 'lucide-react';
import { DSGVO_CONFIG } from '../../config/dsgvoConfig';
import type { AgendaItem } from '../../core/types/models';

interface Props {
  onClose: () => void;
}

export const MyProfileModal: React.FC<Props> = ({ onClose }) => {
  const { user, helpers, users, roleProfiles, updateHelper, saveAgendaItem } = useClubStore();
  
  const myHelper = useMemo(() => {
    if (!user || !helpers) return null;
    return helpers.find(h => h.email.toLowerCase() === user.email.toLowerCase());
  }, [user, helpers]);

  const email = myHelper?.email || '';
  const [telefon, setTelefon] = useState(myHelper?.telefon || '');
  const [emailEltern, setEmailEltern] = useState(myHelper?.emailEltern || '');
  const [telefonEltern, setTelefonEltern] = useState(myHelper?.telefonEltern || '');
  const [consentConfirmed, setConsentConfirmed] = useState(myHelper?.consentConfirmed || false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  if (!myHelper) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profil nicht gefunden</h2>
          <p className="text-gray-600 mb-6">Dein App-Zugang ist mit keinem Mitglieds-Datensatz verknüpft. Bitte melde dich beim Vorstand.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">Schließen</button>
        </div>
      </div>
    );
  }

  const performHardReset = async () => {
    if (!window.confirm("App wirklich reparieren? Dabei wird der Offline-Speicher gelöscht und alle Daten frisch vom Server geladen. Du musst dafür kurz online sein.")) {
      return;
    }

    setIsResetting(true);

    try {
      // 1. Service Worker deregistrieren
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Alle Browser-Caches leeren
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }

      // 3. LocalStorage & SessionStorage putzen
      localStorage.clear();
      sessionStorage.clear();

      // 4. Hard-Reload
      window.location.href = '/';
      
    } catch (error) {
      console.error("Fehler beim Reset:", error);
      alert("Reset fehlgeschlagen. Bitte schließe die App komplett und öffne sie neu.");
      setIsResetting(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const now = Date.now();
      
      let formattedPhone = telefon.trim().replace(/[^0-9+]/g, '');
      if (formattedPhone) {
        if (formattedPhone.startsWith('00')) formattedPhone = '+' + formattedPhone.substring(2);
        else if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('00')) formattedPhone = '+49' + formattedPhone.substring(1);
      }

      let formattedPhoneEltern = telefonEltern.trim().replace(/[^0-9+]/g, '');
      if (formattedPhoneEltern) {
        if (formattedPhoneEltern.startsWith('00')) formattedPhoneEltern = '+' + formattedPhoneEltern.substring(2);
        else if (formattedPhoneEltern.startsWith('0') && !formattedPhoneEltern.startsWith('00')) formattedPhoneEltern = '+49' + formattedPhoneEltern.substring(1);
      }

      const contactDataChanged = 
        myHelper.telefon !== formattedPhone ||
        myHelper.emailEltern !== emailEltern.trim() ||
        myHelper.telefonEltern !== formattedPhoneEltern;

      const consentChanged = myHelper.consentConfirmed !== consentConfirmed;

      const updatedHelper = {
        ...myHelper,
        telefon: formattedPhone,
        emailEltern: emailEltern.trim(),
        telefonEltern: formattedPhoneEltern,
        consentConfirmed,
      };

      if (consentChanged) {
        updatedHelper.dsgvoConsentVersion = consentConfirmed ? DSGVO_CONFIG.version : undefined;
        updatedHelper.consentConfirmedAt = consentConfirmed ? now : undefined;
        updatedHelper.consentConfirmedBy = consentConfirmed ? 'USER' : undefined;
      }

      await updateHelper(updatedHelper);

      if (contactDataChanged && user) {
        const adminUsers = users.filter(u => {
          const profile = roleProfiles.find(p => p.id === u.roleProfileId);
          return profile?.permissions?.manageMitglieder || u.permissions?.manageMitglieder;
        });

        if (adminUsers.length > 0) {
          const notificationTask: Partial<AgendaItem> = {
            id: `sys-info-${now}`,
            schemaVersion: '1.0',
            type: 'INFO',
            title: `System: Daten-Update (${myHelper.name})`,
            description: `Das Mitglied ${myHelper.name} hat seine Kontaktdaten über den Self-Service der App aktualisiert.\n\n**Neue Daten:**\nTelefon: ${formattedPhone || '-'}\nE-Mail (Eltern): ${emailEltern.trim() || '-'}\nTelefon (Eltern): ${formattedPhoneEltern || '-'}\n\nBitte diese neuen Daten in den externen Systemen (Kasse, DTTB, Verteiler) prüfen und bei Bedarf aktualisieren. Klicke auf "Verwerfen", wenn du fertig bist.`,
            status: 'OFFEN',
            progress: 0,
            assigneeUserIds: adminUsers.map(a => a.id),
            assigneeGroupIds: [],
            createdAt: now,
            reminderSenderUserId: user.id,
            reminderLeadDays: 0, 
            dueDate: now, 
          };
          await saveAgendaItem(notificationTask);
        }
      }

      onClose();
    } catch (err) {
      setError("Fehler beim Speichern. Bitte überprüfe deine Verbindung.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Mein Profil & Einstellungen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center border border-red-200">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Stammdaten (Vereinsregister)</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <span className="block text-xs font-bold text-gray-500 uppercase">Name</span>
                <span className="font-medium text-gray-900">{myHelper.name}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase">App-Alias</span>
                <span className="font-medium text-gray-900">{myHelper.alias}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase">Status</span>
                <span className="font-medium text-gray-900">{myHelper.memberStatus || 'Aktiv'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase">Geburtsdatum</span>
                <span className="font-medium text-gray-900">{myHelper.geburtsdatum ? new Date(myHelper.geburtsdatum).toLocaleDateString('de-DE') : '-'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase">Eintrittsdatum</span>
                <span className="font-medium text-gray-900">{myHelper.eintrittsdatum ? new Date(myHelper.eintrittsdatum).toLocaleDateString('de-DE') : '-'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-start">
              <Info className="w-4 h-4 mr-1 shrink-0" /> Bei Namensänderungen wende dich bitte direkt an den Vorstand.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Meine Kontaktdaten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                  E-Mail <Lock className="w-3 h-3 ml-1.5 text-gray-400" />
                </label>
                <input 
                  type="email" value={email} disabled={true}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-100 text-gray-500 cursor-not-allowed outline-none" 
                />
                <p className="text-[10px] text-gray-500 mt-1 leading-tight">Deine E-Mail ist dein System-Login. Bitte wende dich für Änderungen an den Admin.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">E-Mail (Eltern)</label>
                <input 
                  type="email" value={emailEltern} onChange={(e) => setEmailEltern(e.target.value)} disabled={isSaving}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Telefon</label>
                <input 
                  type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} disabled={isSaving}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tel. (Eltern)</label>
                <input 
                  type="tel" value={telefonEltern} onChange={(e) => setTelefonEltern(e.target.value)} disabled={isSaving}
                  className="w-full border border-gray-300 rounded-xl p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white" 
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start">
              <ShieldCheck className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-black text-blue-900 mb-1">Sichtbarkeit im Adressbuch (DSGVO)</h4>
                <p className="text-sm text-blue-800 mb-4">{DSGVO_CONFIG.consentCheckboxText}</p>
                
                <label className="flex items-center cursor-pointer bg-white p-3 rounded-lg border border-blue-100 shadow-sm hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} disabled={isSaving}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="ml-3 font-bold text-gray-800 cursor-pointer select-none">
                    Ja, ich bin mit der Sichtbarkeit einverstanden
                  </span>
                </label>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-blue-200/50 pt-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-800 font-medium">Dein aktueller Status:</span>
                    {consentConfirmed ? (
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold shadow-sm">Sichtbar</span>
                    ) : (
                      <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold shadow-sm">Unsichtbar</span>
                    )}
                  </div>
                  
                  {consentConfirmed && myHelper.consentConfirmedAt && (
                    <div className="text-xs text-blue-700 font-medium">
                      Zustimmung erfasst am: {new Date(myHelper.consentConfirmedAt).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* CHIRURGISCHER EINGRIFF: Fehlerbehebung / Hard-Reset Sektion */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-800 mb-4">Fehlerbehebung / System</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-orange-900 text-sm">App reparieren (Cache leeren)</h4>
                <p className="text-xs text-orange-800 mt-1">Hilft bei Darstellungsproblemen, veralteten Terminen oder wenn die App nach einem Update hängt. Erfordert eine aktive Internetverbindung.</p>
              </div>
              <button 
                onClick={performHardReset}
                disabled={isResetting || isSaving}
                className="shrink-0 flex items-center justify-center px-4 py-2 bg-white text-orange-700 border border-orange-200 font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Repariere...' : 'App reparieren'}
              </button>
            </div>
          </div>

        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors">
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center shadow-md disabled:opacity-50">
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Speichert...' : 'Profil aktualisieren'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---
// [2026-07-22] - FEATURE: DSGVO Clickwrap Komponente. Audit-Trail (Zeitstempel & Akteur) bei Zustimmung integriert.
// src/features/Auth/DsgvoClickwrap.tsx
import React, { useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { DSGVO_CONFIG } from '../../config/dsgvoConfig';
import { ShieldAlert, Check, X } from 'lucide-react';

export const DsgvoClickwrap: React.FC = () => {
  const { user, helpers, updateHelper } = useClubStore();
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Finde den eigenen Helfer-Datensatz des aktuell eingeloggten Users anhand der E-Mail
  const myHelper = useMemo(() => {
    if (!user || !helpers) return null;
    return helpers.find(h => h.email.toLowerCase() === user.email.toLowerCase());
  }, [user, helpers]);

  // Prüfen ob der Clickwrap angezeigt werden muss (Version veraltet oder fehlt)
  const needsConsent = useMemo(() => {
    if (!myHelper) return false;
    return (myHelper.dsgvoConsentVersion || 0) < DSGVO_CONFIG.version;
  }, [myHelper]);

  if (!needsConsent || !myHelper) return null;

  const handleDecision = async (agreed: boolean) => {
    setIsSaving(true);
    try {
      await updateHelper({
        ...myHelper,
        consentConfirmed: agreed,
        dsgvoConsentVersion: DSGVO_CONFIG.version,
        // CHIRURGISCHER EINGRIFF: Audit-Trail protokollieren
        consentConfirmedAt: Date.now(),
        consentConfirmedBy: 'USER'
      });
    } catch (error) {
      console.error("Fehler beim Speichern der DSGVO-Einwilligung:", error);
      alert("Fehler beim Speichern. Bitte überprüfe deine Internetverbindung.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 bg-blue-600 flex items-center text-white shrink-0">
          <ShieldAlert className="w-8 h-8 mr-4" />
          <div>
            <h2 className="text-xl font-black">Datenschutz & App-Sichtbarkeit</h2>
            <p className="text-blue-100 text-sm font-medium mt-1">Bitte lies dir die folgenden Informationen aufmerksam durch.</p>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-b border-gray-200 custom-scrollbar">
          {DSGVO_CONFIG.policyText}
        </div>

        <div className="p-6 bg-white shrink-0 space-y-6">
          <label className="flex items-start cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input 
                type="checkbox" 
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                disabled={isSaving}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <div className="ml-3 text-sm font-bold text-gray-800 leading-snug group-hover:text-black transition-colors">
              {DSGVO_CONFIG.consentCheckboxText}
            </div>
          </label>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={() => handleDecision(false)}
              disabled={isSaving}
              className="px-5 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex-1 flex items-center justify-center"
            >
              <X className="w-4 h-4 mr-2" />
              Ablehnen (Unsichtbar bleiben)
            </button>
            <button 
              onClick={() => handleDecision(true)}
              disabled={!isChecked || isSaving}
              className="px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-xl transition-colors flex-1 flex items-center justify-center shadow-md"
            >
              <Check className="w-4 h-4 mr-2" />
              Zustimmen & Weiter
            </button>
          </div>
          <p className="text-xs text-center text-gray-400 font-medium">
            Du kannst die App auch bei Ablehnung eingeschränkt nutzen, bleibst aber für andere unsichtbar.
          </p>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---
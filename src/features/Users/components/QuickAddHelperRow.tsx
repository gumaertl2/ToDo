// 2026-04-18 09:00 - REFACTORING: Schnelleingabe ausgelagert
// 2026-04-19 14:55 - CHIRURGISCHER EINGRIFF: Always-on Logik & Spalten-Layout Name->Tel->Email->Status->Alias
// src/features/Users/components/QuickAddHelperRow.tsx
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Helper } from '../../../core/types/models';

interface QuickAddHelperRowProps {
  onAdd: (data: Partial<Helper>) => Promise<void>;
  existingAliases: string[];
  hasSensitiveAccess: boolean; 
}

export const QuickAddHelperRow: React.FC<QuickAddHelperRowProps> = ({ onAdd, existingAliases, hasSensitiveAccess }) => {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [memberStatus, setMemberStatus] = useState<'AKTIV'|'PASSIV'|'JUGEND'>('AKTIV');
  const [email, setEmail] = useState('');
  const [geburtsdatum, setGeburtsdatum] = useState('');
  const [eintrittsdatum, setEintrittsdatum] = useState('');
  const [telefon, setTelefon] = useState('');
  const [consent, setConsent] = useState(false);
  const [aliasModified, setAliasModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDateFocused, setIsDateFocused] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!aliasModified) setAlias(val.trim().split(' ')[0]);
  };

  const reset = () => {
    setName(''); setAlias(''); setEmail('');
    setGeburtsdatum(''); setEintrittsdatum(''); setTelefon(''); setConsent(false); setMemberStatus('AKTIV');
    setAliasModified(false);
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !alias.trim() || !consent) return;

    if (existingAliases.map(a => (a||'').toLowerCase()).includes(alias.trim().toLowerCase())) {
      alert(`Der Alias "${alias.trim()}" existiert bereits!`);
      return;
    }

    setIsSaving(true);
    let formattedName = name.trim();
    if (formattedName.includes(',')) {
      const parts = formattedName.split(',');
      if (parts.length === 2) formattedName = `${parts[1].trim()} ${parts[0].trim()}`;
    }

    let formattedPhone = telefon.trim().replace(/[^0-9+]/g, '');
    if (formattedPhone) {
      if (formattedPhone.startsWith('00')) {
        formattedPhone = '+' + formattedPhone.substring(2);
      } else if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('00')) {
        formattedPhone = '+49' + formattedPhone.substring(1);
      }
    }

    await onAdd({
      name: formattedName,
      alias: alias.trim(),
      memberStatus,
      email: email.trim(),
      geburtsdatum: geburtsdatum || undefined,
      eintrittsdatum: eintrittsdatum || undefined,
      telefon: formattedPhone,
      consentConfirmed: consent
    });

    reset();
  };

  return (
    <tr className="bg-blue-50/30 border-t-2 border-blue-200">
      <td className="px-4 py-1.5 whitespace-nowrap">
        <input 
          type="text" 
          value={name} 
          onChange={e => handleNameChange(e.target.value)} 
          placeholder="Neuer Name *" 
          className="w-full p-1.5 text-sm border border-gray-300 rounded outline-none shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100" 
        />
      </td>
      <td className="px-4 py-1.5 whitespace-nowrap">
        <input 
          type="tel" 
          value={telefon} 
          onChange={e => setTelefon(e.target.value)} 
          placeholder="Telefon" 
          className="w-full p-1.5 text-sm border border-gray-300 rounded outline-none shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100" 
        />
      </td>
      <td className="px-4 py-1.5 whitespace-nowrap">
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="E-Mail" 
          className="w-full p-1.5 text-sm border border-gray-300 rounded outline-none shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100" 
        />
      </td>
      <td className="px-4 py-1.5 whitespace-nowrap">
        <select 
          value={memberStatus} 
          onChange={e => setMemberStatus(e.target.value as any)} 
          className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white outline-none shadow-sm focus:border-blue-400"
        >
          <option value="AKTIV">Aktiv</option>
          <option value="PASSIV">Passiv</option>
          <option value="JUGEND">Jugend</option>
        </select>
      </td>
      <td className="px-4 py-1.5 whitespace-nowrap">
        <input 
          type="text" 
          value={alias} 
          onChange={e => {setAlias(e.target.value); setAliasModified(true);}} 
          placeholder="Alias *" 
          className="w-full p-1.5 text-sm border border-blue-200 font-bold text-blue-700 rounded outline-none shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100" 
        />
      </td>
      
      {hasSensitiveAccess && (
        <td className="px-4 py-1.5 whitespace-nowrap">
          <input 
            type={isDateFocused || geburtsdatum ? "date" : "text"}
            onFocus={() => setIsDateFocused(true)}
            onBlur={() => setIsDateFocused(false)}
            value={geburtsdatum} onChange={e => setGeburtsdatum(e.target.value)} 
            placeholder="Geburtstag"
            className="w-full p-1.5 text-sm border border-gray-300 rounded outline-none shadow-sm focus:border-blue-400" 
          />
        </td>
      )}
      {hasSensitiveAccess && (
        <td className="px-4 py-1.5 whitespace-nowrap">
          <input 
            type="date"
            value={eintrittsdatum} 
            onChange={e => setEintrittsdatum(e.target.value)} 
            className="w-full p-1.5 text-sm border border-gray-300 rounded outline-none shadow-sm focus:border-blue-400" 
          />
        </td>
      )}

      <td className="px-4 py-1.5 whitespace-nowrap text-right">
        <div className="flex flex-col items-end gap-1.5">
          <label className="flex items-center text-[10px] text-gray-600 font-medium cursor-pointer" title="DSGVO Zustimmung erforderlich">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mr-1.5 w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500" /> 
            DSGVO ✓
          </label>
          <div className="flex gap-1">
            <button 
              onClick={handleSave} 
              disabled={!name.trim() || !alias.trim() || !consent || isSaving} 
              className="flex items-center justify-center bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-40 transition-all shadow-sm"
              title="Speichern"
            >
              {isSaving ? '...' : <span><Plus className="w-3.5 h-3.5 mr-1 inline-block"/>Hinzufügen</span>}
            </button>
            <button onClick={reset} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors" title="Abbrechen">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
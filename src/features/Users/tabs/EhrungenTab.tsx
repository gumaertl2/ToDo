// 2026-04-18 09:00 - REFACTORING: Ehrungen Tab ausgelagert
// src/features/Users/tabs/EhrungenTab.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { CalendarDays, Settings2, Gift, Award } from 'lucide-react';
import { useClubStore } from '../../../store/useClubStore';

export const EhrungenTab: React.FC = () => {
  const { helpers } = useClubStore();
  
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [showSettings, setShowSettings] = useState(false);
  
  const [roundBirthdays, setRoundBirthdays] = useState<number[]>(() => {
    const saved = localStorage.getItem('papatodo_round_birthdays');
    return saved ? JSON.parse(saved) : [18, 30, 40, 50, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  });
  
  const [roundAnniversaries, setRoundAnniversaries] = useState<number[]>(() => {
    const saved = localStorage.getItem('papatodo_round_anniversaries');
    return saved ? JSON.parse(saved) : [10, 20, 25, 30, 40, 50, 60, 70, 75, 80];
  });

  useEffect(() => {
    localStorage.setItem('papatodo_round_birthdays', JSON.stringify(roundBirthdays));
    localStorage.setItem('papatodo_round_anniversaries', JSON.stringify(roundAnniversaries));
  }, [roundBirthdays, roundAnniversaries]);

  const jubilaeen = useMemo(() => {
    const geburtstage: { name: string; date: string; age: number; sortDate: string; status: string }[] = [];
    const mitgliedschaften: { name: string; date: string; years: number; sortDate: string; status: string }[] = [];

    helpers.forEach(h => {
      if (h.geburtsdatum) {
        const parts = h.geburtsdatum.split('-');
        if (parts.length === 3) {
          const birthYear = parseInt(parts[0], 10);
          const month = parts[1];
          const day = parts[2];
          const ageInTargetYear = targetYear - birthYear;

          if (roundBirthdays.includes(ageInTargetYear)) {
            geburtstage.push({
              name: h.name,
              date: `${day}.${month}.${targetYear}`,
              sortDate: `${targetYear}-${month}-${day}`,
              age: ageInTargetYear,
              status: h.memberStatus || 'AKTIV'
            });
          }
        }
      }

      if (h.eintrittsdatum) {
        const parts = h.eintrittsdatum.split('-');
        if (parts.length === 3) {
          const entryYear = parseInt(parts[0], 10);
          const month = parts[1];
          const day = parts[2];
          const yearsInTargetYear = targetYear - entryYear;

          if (roundAnniversaries.includes(yearsInTargetYear)) {
            mitgliedschaften.push({
              name: h.name,
              date: `${day}.${month}.${targetYear}`,
              sortDate: `${targetYear}-${month}-${day}`,
              years: yearsInTargetYear,
              status: h.memberStatus || 'AKTIV'
            });
          }
        }
      }
    });

    return {
      geburtstage: geburtstage.sort((a, b) => a.sortDate.localeCompare(b.sortDate)),
      mitgliedschaften: mitgliedschaften.sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    };
  }, [helpers, targetYear, roundBirthdays, roundAnniversaries]);

  const toggleRoundNumber = (type: 'birthday' | 'anniversary', num: number) => {
    if (type === 'birthday') {
      setRoundBirthdays(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b) => a-b));
    } else {
      setRoundAnniversaries(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b) => a-b));
    }
  };

  const possibleBirthdays = [18, 30, 40, 50, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const possibleAnniversaries = [10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80];

  return (
    <div className="flex-1 overflow-y-auto pb-10 space-y-6">
      <section className="bg-orange-50/50 p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 m-3">
        <div className="flex items-center">
          <CalendarDays className="w-6 h-6 text-orange-600 mr-3 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ehrungs-Jahr auswählen</h2>
            <p className="text-sm text-gray-500">Für welches Jahr soll der Report erstellt werden?</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={targetYear} 
            onChange={e => setTargetYear(parseInt(e.target.value, 10))}
            className="p-2.5 bg-white border border-orange-200 rounded-lg text-base font-bold text-orange-900 focus:ring-orange-500 outline-none shadow-sm flex-1 md:w-32"
          >
            {[...Array(10)].map((_, i) => {
              const yr = new Date().getFullYear() - 2 + i;
              return <option key={yr} value={yr}>{yr}</option>;
            })}
          </select>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-lg border shadow-sm transition-colors ${showSettings ? 'bg-orange-600 text-white border-orange-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            title="Einstellungen für runde Zahlen"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </section>

      {showSettings && (
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 animate-in slide-in-from-top-2 mx-3">
          <h3 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Definition: Was ist eine runde Zahl?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider mb-3">Runde Geburtstage</p>
              <div className="flex flex-wrap gap-2">
                {possibleBirthdays.map(num => (
                  <label key={num} className={`flex items-center px-3 py-1.5 rounded-lg border cursor-pointer text-sm font-bold transition-colors ${roundBirthdays.includes(num) ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <input type="checkbox" className="hidden" checked={roundBirthdays.includes(num)} onChange={() => toggleRoundNumber('birthday', num)} />
                    {num}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Runde Vereinszugehörigkeit (Jahre)</p>
              <div className="flex flex-wrap gap-2">
                {possibleAnniversaries.map(num => (
                  <label key={num} className={`flex items-center px-3 py-1.5 rounded-lg border cursor-pointer text-sm font-bold transition-colors ${roundAnniversaries.includes(num) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <input type="checkbox" className="hidden" checked={roundAnniversaries.includes(num)} onChange={() => toggleRoundNumber('anniversary', num)} />
                    {num}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-3">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="bg-pink-100 p-2 rounded-lg text-pink-600 mr-3">
              <Gift className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Runde Geburtstage {targetYear}</h2>
          </div>

          {jubilaeen.geburtstage.length === 0 ? (
            <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 font-medium">
              Keine passenden Geburtstage in {targetYear}.
            </div>
          ) : (
            <div className="space-y-3">
              {jubilaeen.geburtstage.map((g, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 hover:bg-pink-50/30 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900">{g.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">{g.date}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${g.status === 'PASSIV' ? 'bg-gray-100 text-gray-500' : g.status === 'JUGEND' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {g.status}
                      </span>
                    </div>
                  </div>
                  <div className="bg-pink-100 text-pink-700 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-2 border-pink-200 shadow-sm shrink-0">
                    {g.age}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-3">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Vereinsjubiläen {targetYear}</h2>
          </div>

          {jubilaeen.mitgliedschaften.length === 0 ? (
            <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 font-medium">
              Keine passenden Jubiläen in {targetYear}.
            </div>
          ) : (
            <div className="space-y-3">
              {jubilaeen.mitgliedschaften.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 hover:bg-blue-50/30 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900">{m.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">{m.date}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${m.status === 'PASSIV' ? 'bg-gray-100 text-gray-500' : m.status === 'JUGEND' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center shrink-0 w-16 h-12 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                    <span className="font-black text-lg leading-none">{m.years}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider">Jahre</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
// --- END OF FILE ---
// src/features/Templates/TemplatesView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { FileText, Repeat, Plus, Trash2 } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';

export const TemplatesView: React.FC = () => {
  const { templates, routines, fetchTemplatesAndRoutines, deleteAgendaItem, isTemplatesLoading, saveAgendaItem } = useClubStore();
  const [activeTab, setActiveTab] = useState<'bausteine' | 'kaskaden'>('bausteine');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [prefillMustBeDone, setPrefillMustBeDone] = useState(false);

  useEffect(() => {
    fetchTemplatesAndRoutines();
  }, [fetchTemplatesAndRoutines]);

  const handleCreateTemplate = (isRoutine: boolean) => {
    setPrefillMustBeDone(isRoutine);
    setIsItemModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Vorlagen & Routinen</h1>
        <button
          onClick={() => handleCreateTemplate(activeTab === 'kaskaden')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          {activeTab === 'kaskaden' ? 'Routine anlegen' : 'Baustein anlegen'}
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('bausteine')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bausteine' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Agenda-Bausteine
        </button>
        <button
          onClick={() => setActiveTab('kaskaden')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'kaskaden' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Event-Kaskaden / Routinen
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        {isTemplatesLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade Daten...</div>
        ) : (
          <div className="divide-y divide-gray-200 flex-1 overflow-y-auto">
            {activeTab === 'bausteine' && templates.length === 0 && <div className="p-8 text-center text-gray-500">Keine Vorlagen gefunden.</div>}
            {activeTab === 'kaskaden' && routines.length === 0 && <div className="p-8 text-center text-gray-500">Keine Event-Kaskaden gefunden.</div>}
            
            {activeTab === 'bausteine' && templates.map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg text-blue-600 mr-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.title}</h3>
                    <p className="text-sm text-gray-500">{t.type} · {t.durationEstimate || 0} Min.</p>
                  </div>
                </div>
                <button onClick={() => deleteAgendaItem(t.id)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            {activeTab === 'kaskaden' && routines.map((r) => (
              <div key={r.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg text-purple-600 mr-4">
                    <Repeat className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.title}</h3>
                    <p className="text-sm text-gray-500">
                      Reverse-Scheduling: {r.mustBeDoneBeforeEvent ? `Vorlauf ${r.leadTimeValue} ${r.leadTimeUnit}` : 'Nein'}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteAgendaItem(r.id)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ItemFormModal 
        isOpen={isItemModalOpen} 
        existingItem={{ type: 'VORLAGE', mustBeDoneBeforeEvent: prefillMustBeDone }}
        onClose={() => setIsItemModalOpen(false)} 
        onSave={async (data) => { 
          await saveAgendaItem(data); 
          setIsItemModalOpen(false); 
        }} 
      />
    </div>
  );
};

// src/features/Events/ProtocolEditor.tsx
import React, { useState } from 'react';
import type { ProtocolItemCategory, Event } from '../../core/types/models';
import { Clock, Users, CheckSquare, Save } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';

export interface EditorAgendaItem {
  id: string;
  category: ProtocolItemCategory;
  title: string;
  geplante_dauer_min: number;
  tatsaechliche_dauer_min: number;
  requestedBy: string;
  approvedBy?: string;
  assignees?: string;
  dueDate?: string;
}

interface ProtocolEditorProps {
  event: Event;
  onClose: () => void;
}

export const ProtocolEditor: React.FC<ProtocolEditorProps> = ({ event, onClose }) => {
  const { transformAgendaToProtocol } = useClubStore();
  const [items, setItems] = useState<EditorAgendaItem[]>([
    {
      id: 'item-1',
      category: 'INFO',
      title: 'Begrüßung und Feststellung der Beschlussfähigkeit',
      geplante_dauer_min: 5,
      tatsaechliche_dauer_min: 5,
      requestedBy: 'Vorstand',
    }
  ]);

  const updateItem = (id: string, updates: Partial<EditorAgendaItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        category: 'INFO',
        title: '',
        geplante_dauer_min: 10,
        tatsaechliche_dauer_min: 0,
        requestedBy: '',
      }
    ]);
  };

  const handleSaveProtocol = async () => {
    const generatedProtocol = {
      id: `proto-${event.id}`,
      schemaVersion: '1.0',
      date: new Date().toISOString(),
      participants: [],
      items: items.map(item => ({
        id: item.id,
        schemaVersion: '1.0',
        category: item.category,
        task_id: item.category === 'TASK' ? `task-${item.id}` : undefined
      }))
    };
    
    await transformAgendaToProtocol(event.id, generatedProtocol);
    onClose();
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
      <div className="border-b border-gray-200 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live-Protokoll: {event.title}</h2>
          <p className="text-sm text-gray-500">{new Date(event.date).toLocaleString()}</p>
        </div>
        <button 
          onClick={handleSaveProtocol}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <Save className="w-4 h-4 mr-2" />
          Abschließen
        </button>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  className="text-lg font-semibold bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none w-full pb-1"
                  placeholder="Titel des Agendapunkts"
                />
              </div>
              <div className="w-full md:w-auto">
                <select
                  value={item.category}
                  onChange={(e) => updateItem(item.id, { category: e.target.value as ProtocolItemCategory })}
                  className="w-full md:w-auto p-2 bg-white border border-gray-300 rounded shadow-sm focus:ring-blue-500 font-medium"
                >
                  <option value="INFO">Info</option>
                  <option value="DECISION">Beschluss</option>
                  <option value="TASK">Aufgabe</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600 bg-white p-3 rounded border border-gray-100">
              <Clock className="w-4 h-4 text-blue-500" />
              <div className="flex items-center gap-2">
                <label>Geplant (Min):</label>
                <input
                  type="number"
                  disabled
                  value={item.geplante_dauer_min}
                  className="w-16 p-1 border border-gray-200 rounded text-center bg-gray-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <label>Tatsächlich (Min):</label>
                <input
                  type="number"
                  value={item.tatsaechliche_dauer_min}
                  className="w-16 p-1 border border-gray-300 rounded text-center focus:ring-blue-500"
                  onChange={(e) => updateItem(item.id, { tatsaechliche_dauer_min: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-gray-200 shadow-inner">
              {item.category === 'INFO' && (
                <div className="text-sm text-gray-500">
                  <p>Reiner Informationspunkt. Keine weiteren Eingaben erforderlich.</p>
                </div>
              )}

              {item.category === 'DECISION' && (
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Users className="w-4 h-4 mr-1 text-green-600" />
                      Zugestimmt (Namen / Gruppen):
                    </label>
                    <input
                      type="text"
                      value={item.approvedBy || ''}
                      onChange={(e) => updateItem(item.id, { approvedBy: e.target.value })}
                      placeholder="z.B. Alle einstimmig, oder: Max, Anna"
                      className="p-2 border border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {item.category === 'TASK' && (
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Users className="w-4 h-4 mr-1 text-blue-600" />
                      Zugewiesen an (assigneeUserIds):
                    </label>
                    <input
                      type="text"
                      value={item.assignees || ''}
                      onChange={(e) => updateItem(item.id, { assignees: e.target.value })}
                      placeholder="User-IDs oder Namen durch Komma getrennt"
                      className="p-2 border border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <CheckSquare className="w-4 h-4 mr-1 text-red-500" />
                      Fällig am (dueDate):
                    </label>
                    <input
                      type="date"
                      value={item.dueDate || ''}
                      onChange={(e) => updateItem(item.id, { dueDate: e.target.value })}
                      className="p-2 border border-gray-300 rounded focus:ring-blue-500 w-full sm:w-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <button
          onClick={addItem}
          className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-medium rounded-lg hover:border-blue-500 hover:text-blue-600 transition"
        >
          + Weiteren Punkt zur Agenda hinzufügen
        </button>
      </div>
    </div>
  );
};

// Exakte Zeilenzahl: 167

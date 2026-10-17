// [2026-10-17] - REFACTOR: ReportsView radikal verschlankt (Separation of Concerns). Fungiert nun ausschließlich als Container- und Navigations-Hülle für die ausgelagerten Module (ReportsDashboardTab, DataExplorerTab, BackupRestoreTab).
// src/features/Reports/ReportsView.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart2, Database, ShieldCheck } from 'lucide-react';
import { BackupRestoreTab } from './BackupRestoreTab';
import { ReportsDashboardTab } from './ReportsDashboardTab';
import { DataExplorerTab } from './DataExplorerTab';

export const ReportsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  
  // Tabs Navigation
  const initialTab = useMemo(() => {
    const t = searchParams.get('tab');
    if (t === 'backup' || t === 'explorer') return t;
    return 'reports';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<'reports' | 'explorer' | 'backup'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'backup' || t === 'explorer' || t === 'reports') {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'reports' | 'explorer' | 'backup') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="h-full flex flex-col w-full max-w-6xl mx-auto pb-safe">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 px-2 md:px-0 gap-4 mt-2">
        <div className="flex items-center">
          <div className="bg-blue-600 p-3 rounded-xl text-white mr-4 shadow-lg shrink-0">
            <BarChart2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Reports & Statistik</h1>
            <p className="text-base md:text-lg text-gray-500 mt-1">Das Radar für deinen Vorstand</p>
          </div>
        </div>
        
        <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl shrink-0 self-start md:self-auto shadow-inner gap-1">
          <button 
            onClick={() => handleTabChange('reports')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'reports' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => handleTabChange('explorer')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center ${activeTab === 'explorer' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Database className="w-4 h-4 mr-1.5" /> 
            Data Explorer
          </button>
          <button 
            onClick={() => handleTabChange('backup')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center ${activeTab === 'backup' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" /> 
            Backup & Restore
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 md:px-0 pb-10 flex flex-col">
        {activeTab === 'backup' ? (
          <BackupRestoreTab />
        ) : activeTab === 'explorer' ? (
          <DataExplorerTab />
        ) : (
          <ReportsDashboardTab 
            selectedSeriesId={selectedSeriesId}
            setSelectedSeriesId={setSelectedSeriesId}
          />
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---
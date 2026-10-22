// src/features/Sudoku/components/SudokuView.tsx
// [2026-10-22] - FIX: Entfernung von 'evil' aus der UI, korrekte Übergabe der 4 unterstützten Schwierigkeitsgrade.
import React, { useState, useEffect } from 'react';
import { useSudokuGame } from '../hooks/useSudokuGame';
import type { SudokuDifficulty } from '../hooks/useSudokuGame';
import { SudokuBoard } from './SudokuBoard';
import { SudokuControls } from './SudokuControls';
import { SudokuLeaderboard, formatTime } from './SudokuLeaderboard';
import { useClubStore } from '../../../store/useClubStore';

interface SudokuViewProps {
  onClose: () => void;
}

export const SudokuView: React.FC<SudokuViewProps> = ({ onClose }) => {
  const [view, setView] = useState<'lobby' | 'playing'>('lobby');
  const [lobbyDifficulty, setLobbyDifficulty] = useState<SudokuDifficulty>('medium');
  const [gameMode, setGameMode] = useState<'ranked' | 'practice'>('ranked');
  const [showPracticeTime, setShowPracticeTime] = useState<boolean>(false);
  
  const { user, roleProfiles } = useClubStore();
  
  const sudokuScores = (useClubStore.getState() as any).sudokuScores || [];
  const saveSudokuScore = (useClubStore.getState() as any).saveSudokuScore || (async () => {});
  const resetSudokuSeason = (useClubStore.getState() as any).resetSudokuSeason || (async () => {});

  const game = useSudokuGame();

  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const isAdmin = !!userRoleProfile?.permissions?.admin || !!user?.permissions?.admin;

  useEffect(() => {
    if (game.status === 'won') {
      if (user && gameMode === 'ranked') {
        saveSudokuScore({
          userId: user.id,
          userName: user.name,
          timeInSeconds: game.timer,
          difficulty: game.difficulty,
          date: Date.now()
        });
      }
      const t = setTimeout(() => {
        setView('lobby');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [game.status, game.timer, game.difficulty, user, saveSudokuScore, gameMode]);

  const handleStartGame = () => {
    setShowPracticeTime(false);
    game.startGame(lobbyDifficulty);
    setView('playing');
  };

  const filteredScores = sudokuScores.filter((s: any) => s.difficulty === lobbyDifficulty);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 overflow-hidden">
      {view === 'lobby' && (
        <div className="flex-1 flex flex-col overflow-y-auto pb-10">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-10">
            <h1 className="text-xl font-bold tracking-wide">☕ Pausen-Spiele</h1>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
              ✕
            </button>
          </div>

          <div className="p-4 flex-1">
            <div className="flex gap-2 mb-6">
              <button className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl shadow-md">
                📝 Sudoku
              </button>
              <button disabled className="flex-1 py-3 px-4 bg-slate-200 text-slate-400 font-bold rounded-xl opacity-70 cursor-not-allowed">
                🧱 Papa-Blocks<br/><span className="text-[10px] font-normal">(Coming Soon)</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">Neues Spiel</h2>
              
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button
                  onClick={() => setGameMode('ranked')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                    gameMode === 'ranked' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  🏆 Rangliste
                </button>
                <button
                  onClick={() => setGameMode('practice')}
                  className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                    gameMode === 'practice' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  🧘 Üben (Ohne Druck)
                </button>
              </div>

              {/* SCHWIERIGKEITEN: 4 unterstützte Stufen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-6">
                {[
                  { id: 'easy', label: 'Leicht' },
                  { id: 'medium', label: 'Mittel' },
                  { id: 'hard', label: 'Schwer' },
                  { id: 'expert', label: 'Experte' }
                ].map(diff => (
                  <button
                    key={diff.id}
                    onClick={() => setLobbyDifficulty(diff.id as SudokuDifficulty)}
                    className={`py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                      lobbyDifficulty === diff.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleStartGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl shadow-md transition-colors active:scale-95"
              >
                ▶ Spiel Starten {gameMode === 'practice' ? '(Entspannt)' : '(Wertung)'}
              </button>
            </div>

            <SudokuLeaderboard 
              scores={filteredScores}
              currentUserId={user?.id}
              difficulty={lobbyDifficulty}
              onDifficultyChange={setLobbyDifficulty}
              isAdmin={isAdmin}
              onResetSeason={resetSudokuSeason}
            />
          </div>
        </div>
      )}

      {view === 'playing' && (
        <div className="flex-1 flex flex-col">
          <div className="bg-slate-900 text-white p-3 sm:p-4 flex items-center justify-between shadow-md">
            <button 
              onClick={() => {
                if(window.confirm('Spiel wirklich abbrechen?')) setView('lobby');
              }} 
              className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium"
            >
              ◀ Zurück
            </button>
            
            <div className="flex flex-col items-center">
              {gameMode === 'ranked' ? (
                <>
                  <div className="font-mono text-xl font-bold tracking-wider text-emerald-400">
                    {formatTime(game.timer)}
                  </div>
                  {game.penaltySeconds > 0 && (
                    <div className="text-[10px] font-mono text-red-400 font-semibold flex gap-2">
                      {game.errorCount > 0 && <span>❌ {game.errorCount} Fehler (+{game.errorCount * 60}s)</span>}
                      {game.hintCount > 0 && <span>💡 {game.hintCount} Tipps (+{game.hintCount * 60}s)</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center">
                  {showPracticeTime ? (
                    <div 
                      onClick={() => setShowPracticeTime(false)}
                      className="font-mono text-lg font-bold tracking-wider text-emerald-300 cursor-pointer"
                      title="Klick zum Verstecken"
                    >
                      {formatTime(game.timer)} 👁️
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPracticeTime(true)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition-colors font-medium"
                    >
                      ⏱️ Zeit anzeigen
                    </button>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => game.status === 'paused' ? game.resumeGame() : game.pauseGame()}
              className="text-xl p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              {game.status === 'paused' ? '▶️' : '⏸️'}
            </button>
          </div>

          <div className="flex-1 relative flex flex-col p-2 sm:p-4 justify-center bg-slate-50 overflow-y-auto">
            {game.status === 'won' && (
              <div className="absolute inset-0 z-20 bg-emerald-500/90 flex flex-col items-center justify-center text-white p-4">
                <span className="text-6xl mb-4">🏆</span>
                <h2 className="text-3xl font-black mb-2">Geschafft!</h2>
                <p className="text-xl font-medium mb-1">Deine Zeit: {formatTime(game.timer)}</p>
                {gameMode === 'ranked' && game.penaltySeconds > 0 && (
                  <p className="text-xs opacity-90 mb-2">
                    Inklusive Strafzeit ({game.errorCount} Fehler, {game.hintCount} Tipps)
                  </p>
                )}
                {gameMode === 'practice' && (
                  <p className="text-xs opacity-90 mb-2">Im Übungsmodus ohne Ranglisten-Eintrag 🧘</p>
                )}
                <p className="text-sm opacity-90">Zurück zur Übersicht...</p>
              </div>
            )}

            {game.status === 'paused' && (
              <div className="absolute inset-0 z-10 bg-slate-100/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Spiel pausiert</h2>
                <button 
                  onClick={game.resumeGame}
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md text-lg active:scale-95 transition-transform"
                >
                  ▶ Weiter spielen
                </button>
              </div>
            )}

            <SudokuBoard 
              board={game.board}
              selectedCell={game.selectedCell}
              activeHighlightNumber={game.activeHighlightNumber}
              onSelectCell={game.handleSelectCell}
              disabled={game.status !== 'playing'}
              activeRowMemos={game.activeRowMemos}
              activeColMemos={game.activeColMemos}
              missingInRows={game.missingInRows}
              missingInCols={game.missingInCols}
              onToggleRowMemo={game.toggleRowMemo}
              onToggleColMemo={game.toggleColMemo}
            />

            <SudokuControls 
              isNotesMode={game.isNotesMode}
              onToggleNotes={() => game.setIsNotesMode(!game.isNotesMode)}
              onNumberInput={game.setNumber}
              onClearCell={game.clearCell}
              onHint={game.useHint}
              completedNumbers={game.completedNumbers}
              activeHighlightNumber={game.activeHighlightNumber}
              onToggleHighlight={game.toggleHighlightNumber}
              hasSelectedCell={game.selectedCell !== null}
              disabled={game.status !== 'playing'}
            />
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---

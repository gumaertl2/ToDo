// src/features/Sudoku/components/SudokuView.tsx
// [2026-10-23] - FEATURE: Gamification Win-Screen integriert (evaluateScore & SudokuWinScreen). Automatischer Timeout entfernt für bessere UX.
import React, { useState, useEffect } from 'react';
import { useSudokuGame } from '../hooks/useSudokuGame';
import type { SudokuDifficulty } from '../hooks/useSudokuGame';
import { SudokuBoard } from './SudokuBoard';
import { SudokuControls } from './SudokuControls';
import { SudokuLeaderboard, formatTime } from './SudokuLeaderboard';
import { SudokuWinScreen } from './SudokuWinScreen';
import { evaluateScore } from '../utils/scoreEvaluator';
import type { EvaluationResult } from '../utils/scoreEvaluator';
import { useClubStore } from '../../../store/useClubStore';

interface SudokuViewProps {
  onClose: () => void;
}

export const SudokuView: React.FC<SudokuViewProps> = ({ onClose }) => {
  const [view, setView] = useState<'lobby' | 'playing'>('lobby');
  const [lobbyDifficulty, setLobbyDifficulty] = useState<SudokuDifficulty>('medium');
  const [gameMode, setGameMode] = useState<'ranked' | 'practice'>('ranked');
  const [showPracticeTime, setShowPracticeTime] = useState<boolean>(false);
  const [sessionTitle, setSessionTitle] = useState<string>(() => {
    return localStorage.getItem('sudoku_session_title') || 'Pausen-Spiele: Erste Runde';
  });
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>(sessionTitle);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  
  const { user, roleProfiles } = useClubStore();
  
  const sudokuScores = (useClubStore.getState() as any).sudokuScores || [];
  const saveSudokuScore = (useClubStore.getState() as any).saveSudokuScore || (async () => {});
  const resetSudokuSeason = (useClubStore.getState() as any).resetSudokuSeason || (async () => {});

  const game = useSudokuGame();

  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const isAdmin = 
    user?.rolle === 'ADMIN' || 
    user?.rolle === 'admin' || 
    userRoleProfile?.name === 'ADMIN' || 
    (useClubStore.getState() as any).isAdmin?.() || 
    false;

  useEffect(() => {
    if (game.status === 'won') {
      if (!evaluation) {
        const result = evaluateScore(
          game.timer,
          game.penaltySeconds,
          game.difficulty,
          gameMode,
          game.hasUsedPause,
          sudokuScores
        );
        setEvaluation(result);

        // Automatisches Speichern nur für Ranglisten-Spiele ohne Pause
        if (user && gameMode === 'ranked' && !game.hasUsedPause) {
          saveSudokuScore({
            userId: user.id,
            userName: user.name,
            timeInSeconds: game.timer,
            difficulty: game.difficulty,
            date: Date.now()
          });
        }
      }
    } else {
      if (evaluation !== null) {
        setEvaluation(null);
      }
    }
  }, [game.status, game.timer, game.penaltySeconds, game.difficulty, gameMode, game.hasUsedPause, sudokuScores, user, saveSudokuScore, evaluation]);

  const handleRetroactiveSave = () => {
    if (user && gameMode === 'practice' && !game.hasUsedPause) {
      saveSudokuScore({
        userId: user.id,
        userName: user.name,
        timeInSeconds: game.timer,
        difficulty: game.difficulty,
        date: Date.now()
      });
    }
  };

  const handleStartGame = () => {
    setShowPracticeTime(false);
    setEvaluation(null);
    game.startGame(lobbyDifficulty);
    setView('playing');
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      setSessionTitle(tempTitle.trim());
      localStorage.setItem('sudoku_session_title', tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const filteredScores = sudokuScores.filter((s: any) => s.difficulty === lobbyDifficulty);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-100 overflow-hidden isolate">
      {view === 'lobby' && (
        <div className="flex-1 flex flex-col overflow-y-auto pb-10">
          <div className="bg-slate-900 text-white p-4 pt-[max(env(safe-area-inset-top),1rem)] flex items-center justify-between shadow-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-wide">☕ {sessionTitle}</h1>
              {isAdmin && !isEditingTitle && (
                <button 
                  onClick={() => { setTempTitle(sessionTitle); setIsEditingTitle(true); }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-slate-300 transition-colors shadow-sm flex items-center gap-1"
                >
                  <span>✏️</span>
                  <span>Titel bearbeiten</span>
                </button>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <span>◀</span>
              <span className="hidden sm:inline">Zurück zur App</span>
            </button>
          </div>

          {isAdmin && isEditingTitle && (
            <div className="bg-blue-900 text-white p-3 px-4 flex items-center gap-2 shadow-inner">
              <input 
                type="text" 
                value={tempTitle} 
                onChange={(e) => setTempTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded text-slate-900 font-medium text-sm bg-white"
                placeholder="Titel der Runde eingeben..."
              />
              <button 
                onClick={handleSaveTitle}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-sm font-bold shadow"
              >
                Speichern
              </button>
              <button 
                onClick={() => setIsEditingTitle(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium"
              >
                Abbrechen
              </button>
            </div>
          )}

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
          <div className="bg-slate-900 text-white p-3 sm:p-4 pt-[max(env(safe-area-inset-top),1rem)] flex items-center justify-between shadow-md">
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
                  <div className={`font-mono text-xl font-bold tracking-wider ${game.hasUsedPause ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatTime(game.timer)}
                  </div>
                  {game.hasUsedPause && (
                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                      Außer Wertung
                    </div>
                  )}
                  {!game.hasUsedPause && game.penaltySeconds > 0 && (
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
            
            {game.status === 'won' && evaluation && (
              <SudokuWinScreen 
                timer={game.timer}
                penaltySeconds={game.penaltySeconds}
                errorCount={game.errorCount}
                hintCount={game.hintCount}
                gameMode={gameMode}
                hasUsedPause={game.hasUsedPause}
                evaluation={evaluation}
                onClose={() => setView('lobby')}
                onRetroactiveSave={handleRetroactiveSave}
              />
            )}

            {game.status === 'paused' && (
              <div className="absolute inset-0 z-10 bg-slate-100/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Spiel pausiert</h2>
                {gameMode === 'ranked' && (
                  <div className="bg-amber-100 text-amber-900 p-4 rounded-xl max-w-sm text-center mb-8 border border-amber-300">
                    <p className="font-bold mb-1">Hinweis für die Rangliste:</p>
                    <p className="text-sm">Pausierte Spiele werden nicht im Leaderboard gespeichert, um Schummeln zu verhindern.</p>
                  </div>
                )}
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

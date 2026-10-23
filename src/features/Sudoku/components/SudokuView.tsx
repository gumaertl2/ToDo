// src/features/Sudoku/components/SudokuView.tsx
// [2026-10-23] - FEATURE: 'handleRescue' integriert. Prüft Fehler auf dem Brett und fragt vor dem Löschen per Confirm nach (inkl. Kosten-Vorschau).
// [2026-10-23] - BUGFIX: Gast-Abstürze behoben. Firebase onSnapshot und fetch-Calls fangen nun Permission-Errors (fehlender Login) sanft ab, ohne die React-Komponente zu crashen.
// [2026-10-23] - TWEAK: Layout-Paddings und Abstände extrem komprimiert, um Platz auf mobilen Geräten zu sparen.
// [2026-10-23] - FEATURE: "Papa-Blocks" in "MaxBlock" umbenannt und aktiviert. Absprung in die MaxBlockView eingebaut.
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useSudokuGame } from '../hooks/useSudokuGame';
import type { SudokuDifficulty } from '../hooks/useSudokuGame';
import { SudokuBoard } from './SudokuBoard';
import { SudokuControls } from './SudokuControls';
import { SudokuLeaderboard, formatTime } from './SudokuLeaderboard';
import { SudokuWinScreen } from './SudokuWinScreen';
import { evaluateScore } from '../utils/scoreEvaluator';
import type { EvaluationResult } from '../utils/scoreEvaluator';
import { useClubStore } from '../../../store/useClubStore';
import { MaxBlockView } from '../../MaxBlock/components/MaxBlockView';

interface SudokuViewProps {
  onClose: () => void;
}

export const SudokuView: React.FC<SudokuViewProps> = ({ onClose }) => {
  const [view, setView] = useState<'lobby' | 'playing'>('lobby');
  const [showMaxBlock, setShowMaxBlock] = useState(false);
  const [lobbyDifficulty, setLobbyDifficulty] = useState<SudokuDifficulty>('medium');
  const [gameMode, setGameMode] = useState<'ranked' | 'practice'>('ranked');
  const [showPracticeTime, setShowPracticeTime] = useState<boolean>(false);
  const [sessionTitle, setSessionTitle] = useState<string>('Pausen-Spiele: Erste Runde');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  
  const clubStore = useClubStore() as any;
  const user = clubStore.user;
  const roleProfiles = clubStore.roleProfiles || [];
  const sudokuScores = clubStore.sudokuScores || [];
  const saveSudokuScore = clubStore.saveSudokuScore || (async () => {});
  const resetSudokuSeason = clubStore.resetSudokuSeason || (async () => {});
  const fetchSudokuScores = clubStore.fetchSudokuScores || (async () => {});

  const game = useSudokuGame();

  const userRoleProfile = roleProfiles.find((p: any) => p.id === user?.roleProfileId);
  const isAdmin = 
    user?.rolle === 'ADMIN' || 
    user?.rolle === 'admin' || 
    userRoleProfile?.name === 'ADMIN' || 
    clubStore.isAdmin?.() || 
    false;

  useEffect(() => {
    // Fehler bei fehlenden Rechten (Gast-Modus) sanft ignorieren
    fetchSudokuScores().catch((e: any) => console.warn("Score Fetch Info:", e.message));
  }, [fetchSudokuScores]);

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'arcade'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sudokuTitle) {
            setSessionTitle(data.sudokuTitle);
            setTempTitle(prev => (prev === '' ? data.sudokuTitle : prev));
          }
        }
      }, (error) => {
        // POKA-YOKE: Verhindert den Absturz, wenn ein Gast keine Leserechte für 'settings' hat
        console.warn("Lobby Sync Info (Gast-Modus):", error.message);
      });
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

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

        if (user && gameMode === 'ranked' && !game.hasUsedPause) {
          saveSudokuScore({
            userId: user.id,
            userName: user.name,
            timeInSeconds: game.timer,
            difficulty: game.difficulty,
            date: Date.now()
          }).catch((e: any) => console.warn(e));
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
      }).catch((e: any) => console.warn(e));
    }
  };

  const handleStartGame = () => {
    setShowPracticeTime(false);
    setEvaluation(null);
    game.startGame(lobbyDifficulty);
    setView('playing');
  };

  const handleSaveTitle = async () => {
    if (tempTitle.trim()) {
      const newTitle = tempTitle.trim();
      setSessionTitle(newTitle);
      setIsEditingTitle(false);
      
      try {
        await setDoc(doc(db, 'settings', 'arcade'), { sudokuTitle: newTitle }, { merge: true });
      } catch (e) {
        console.error("Fehler beim Speichern des Turniertitels in Firebase:", e);
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleRescue = () => {
    if (game.status !== 'playing') return;
    
    // Prüfen, ob überhaupt Fehler vorliegen
    const errorCount = game.board.filter(c => !c.isFixed && c.value !== null && c.value !== c.solution).length;
    
    if (errorCount === 0) {
      window.alert('Keine Fehler gefunden! Alle bisher gesetzten Zahlen sind korrekt.');
      return;
    }

    const confirmMsg = `Du hast ${errorCount} fehlerhafte Zahl(en) gesetzt. Soll ich sie vom Brett wischen?\n\n(Kosten: ${errorCount} Fehler / +${errorCount * 60}s Strafe)`;
    if (window.confirm(confirmMsg)) {
      game.rescueGame();
    }
  };

  if (showMaxBlock) {
    return <MaxBlockView onClose={() => setShowMaxBlock(false)} />;
  }

  const filteredScores = sudokuScores.filter((s: any) => s.difficulty === lobbyDifficulty);

  return (
    <div className="fixed inset-0 h-[100dvh] z-[9999] flex flex-col bg-slate-100 overflow-hidden isolate">
      {view === 'lobby' && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="bg-slate-900 text-white px-3 py-2.5 pt-[max(env(safe-area-inset-top),0.5rem)] flex items-center justify-between shadow-md sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wide">☕ {sessionTitle}</h1>
              {isAdmin && !isEditingTitle && (
                <button 
                  onClick={() => { setTempTitle(sessionTitle); setIsEditingTitle(true); }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 transition-colors shadow-sm"
                >
                  ✏️ Edit
                </button>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              ◀ Zurück
            </button>
          </div>

          {isAdmin && isEditingTitle && (
            <div className="bg-blue-900 text-white p-2 px-3 flex items-center gap-2 shadow-inner text-xs">
              <input 
                type="text" 
                value={tempTitle} 
                onChange={(e) => setTempTitle(e.target.value)}
                className="flex-1 px-2 py-1 rounded text-slate-900 font-medium bg-white"
                placeholder="Turniertitel..."
              />
              <button onClick={handleSaveTitle} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded font-bold">OK</button>
              <button onClick={() => setIsEditingTitle(false)} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded font-medium">Abbruch</button>
            </div>
          )}

          {/* Extrem komprimierter Main-Bereich */}
          <div className="p-3 sm:p-4 flex-1 w-full max-w-md mx-auto flex flex-col">
            
            {/* Game Tabs */}
            <div className="flex gap-2 mb-3">
              <button className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm cursor-default">
                📝 Sudoku
              </button>
              <button 
                onClick={() => setShowMaxBlock(true)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-colors active:scale-95"
              >
                🧱 MaxBlock
              </button>
            </div>

            {/* Config Box */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm mb-3 border border-slate-200">
              <h2 className="text-base font-bold text-slate-800 mb-3 text-center">Neues Spiel</h2>
              
              <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                <button
                  onClick={() => setGameMode('ranked')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    gameMode === 'ranked' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500'
                  }`}
                >
                  🏆 Rangliste
                </button>
                <button
                  onClick={() => setGameMode('practice')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    gameMode === 'practice' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-500'
                  }`}
                >
                  🧘 Üben
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl mb-3 gap-1">
                {[
                  { id: 'easy', label: 'Leicht' },
                  { id: 'medium', label: 'Mittel' },
                  { id: 'hard', label: 'Schwer' },
                  { id: 'expert', label: 'Experte' }
                ].map(diff => (
                  <button
                    key={diff.id}
                    onClick={() => setLobbyDifficulty(diff.id as SudokuDifficulty)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      lobbyDifficulty === diff.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleStartGame}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base rounded-xl shadow-sm transition-colors active:scale-95"
              >
                ▶ Starten {gameMode === 'practice' ? '(Entspannt)' : ''}
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

      {/* Spielen-Ansicht bleibt unberührt */}
      {view === 'playing' && (
        <div className="flex-1 flex flex-col">
          <div className="bg-slate-900 text-white p-3 pt-[max(env(safe-area-inset-top),0.5rem)] flex items-center justify-between shadow-md">
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
                      {game.errorCount > 0 && <span>❌ {game.errorCount} (+{game.errorCount * 60}s)</span>}
                      {game.hintCount > 0 && <span>💡 {game.hintCount} (+{game.hintCount * 60}s)</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center">
                  {showPracticeTime ? (
                    <div 
                      onClick={() => setShowPracticeTime(false)}
                      className="font-mono text-lg font-bold tracking-wider text-emerald-300 cursor-pointer"
                    >
                      {formatTime(game.timer)} 👁️
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPracticeTime(true)}
                      className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-medium"
                    >
                      ⏱️ Zeit
                    </button>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => game.status === 'paused' ? game.resumeGame() : game.pauseGame()}
              className="text-xl p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              {game.status === 'paused' ? '▶️' : '⏸️'}
            </button>
          </div>

          <div className="flex-1 relative flex flex-col p-2 justify-center bg-slate-50 overflow-y-auto">
            {game.status === 'won' && evaluation && (
              <SudokuWinScreen 
                timer={game.timer}
                penaltySeconds={game.penaltySeconds}
                errorCount={game.errorCount}
                hintCount={game.hintCount}
                hasUsedPause={game.hasUsedPause}
                evaluation={evaluation}
                onClose={() => setView('lobby')}
                onRetroactiveSave={handleRetroactiveSave}
              />
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
              onRescue={handleRescue}
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
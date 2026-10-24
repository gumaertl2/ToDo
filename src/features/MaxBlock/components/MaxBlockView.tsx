// src/features/MaxBlock/components/MaxBlockView.tsx
// [2026-10-24] - UX-IMPROVEMENT: Kopfzeile in Lobby und Spielansicht (Score | Level | Next) auf Spielbreite (max-w-md mx-auto) zentriert und '◀ Zurück' konsistent auf die linke Seite über dem Spiel positioniert.
// [2026-10-23] - UX-FEATURE: Alert für unregistrierte Nutzer (Gäste) beim Versuch, den Score zu speichern, hinzugefügt.
// [2026-10-23] - BUGFIX: Gast-Abstürze behoben. Firebase onSnapshot und fetch-Calls fangen nun Permission-Errors (fehlender Login) sanft ab, ohne die React-Komponente zu crashen.
// [2026-10-23] - FEATURE: MaxBlock-Schwierigkeitsgrade an Sudoku angeglichen (Leicht, Mittel, Schwer, Experte) inkl. individuellem Start-Level-Stepper für Experten.
// [2026-10-23] - REFACTOR: Lobby 100% identisch zu Sudoku gemacht (extrem platzsparend, Navbar Sync, Leaderboard Design).
// [2026-10-23] - BUGFIX: Viewport-Höhe auf h-[100dvh] optimiert.
import React, { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useMaxBlockGame } from '../hooks/useMaxBlockGame';
import { MaxBlockBoard } from './MaxBlockBoard';
import { MaxBlockControls } from './MaxBlockControls';
import { MaxBlockLeaderboard } from './MaxBlockLeaderboard';
import { BLOCKS } from '../utils/blocks';
import type { BlockType } from '../utils/blocks';
import { useClubStore } from '../../../store/useClubStore';
import { evaluateMaxBlockScore } from '../utils/maxBlockScoreEvaluator';

interface MaxBlockViewProps {
  onClose: () => void;
}

const LOCAL_PB_KEY = 'maxBlock_local_pb';
const LOCAL_DIFF_KEY = 'maxBlock_difficulty';
const LOCAL_EXPERT_KEY = 'maxBlock_expert_level';

export const MaxBlockView: React.FC<MaxBlockViewProps> = ({ onClose }) => {
  const [view, setView] = useState<'lobby' | 'playing'>('lobby');
  const [gameMode, setGameMode] = useState<'ranked' | 'practice'>('ranked');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [expertLevel, setExpertLevel] = useState<number>(15);
  const [hasSaved, setHasSaved] = useState(false);
  const [localBest, setLocalBest] = useState<number>(0);
  const [sessionTitle, setSessionTitle] = useState<string>('Pausen-Spiele: Erste Runde');
  
  const game = useMaxBlockGame();
  
  const user = useClubStore(state => state.user);
  const maxBlockScores = useClubStore(state => state.maxBlockScores || []);
  const saveMaxBlockScore = useClubStore(state => state.saveMaxBlockScore);
  const fetchMaxBlockScores = useClubStore(state => state.fetchMaxBlockScores);

  useEffect(() => {
    try {
      const savedPb = localStorage.getItem(LOCAL_PB_KEY);
      if (savedPb) setLocalBest(parseInt(savedPb, 10) || 0);

      const savedDiff = localStorage.getItem(LOCAL_DIFF_KEY);
      if (savedDiff && ['easy', 'medium', 'hard', 'expert'].includes(savedDiff)) {
        setDifficulty(savedDiff as any);
      }

      const savedExpert = localStorage.getItem(LOCAL_EXPERT_KEY);
      if (savedExpert) setExpertLevel(parseInt(savedExpert, 10) || 15);
    } catch (e) {
      console.error("Fehler beim Laden der MaxBlock Settings:", e);
    }
  }, []);

  useEffect(() => {
    if (fetchMaxBlockScores) {
      fetchMaxBlockScores().catch((e: any) => console.warn("Score Fetch Info:", e.message));
    }
  }, [fetchMaxBlockScores]);

  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'settings', 'arcade'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sudokuTitle) setSessionTitle(data.sudokuTitle);
        }
      }, (error) => {
        console.warn("Lobby Sync Info (Gast-Modus):", error.message);
      });
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    if (game.status === 'gameover' && game.score > 0 && gameMode === 'ranked') {
      if (game.score > localBest) {
        setLocalBest(game.score);
        try {
          localStorage.setItem(LOCAL_PB_KEY, game.score.toString());
        } catch (e) {}
      }
    }
  }, [game.status, game.score, gameMode, localBest]);

  const handleDifficultyChange = (diff: 'easy' | 'medium' | 'hard' | 'expert') => {
    setDifficulty(diff);
    try {
      localStorage.setItem(LOCAL_DIFF_KEY, diff);
    } catch (e) {}
  };

  const handleExpertLevelChange = (delta: number) => {
    setExpertLevel(prev => {
      const next = Math.max(11, Math.min(50, prev + delta));
      try {
        localStorage.setItem(LOCAL_EXPERT_KEY, next.toString());
      } catch (e) {}
      return next;
    });
  };

  const handleStartGame = () => {
    setHasSaved(false);
    
    let levelToStart = 1;
    if (difficulty === 'medium') levelToStart = 5;
    if (difficulty === 'hard') levelToStart = 10;
    if (difficulty === 'expert') levelToStart = expertLevel;

    game.startGame(levelToStart);
    setView('playing');
  };

  const handleSaveScore = async () => {
    if (!user) {
      window.alert('Speichern geht nur für registrierte Nutzer!');
      return;
    }

    if (game.score > 0 && !hasSaved && saveMaxBlockScore && gameMode === 'ranked') {
      setHasSaved(true);
      try {
        await saveMaxBlockScore({
          userId: user.id,
          userName: user.name,
          score: game.score,
          lines: game.lines,
          level: game.level,
          date: Date.now()
        });
        setView('lobby');
      } catch (e: any) {
        console.warn("Speichern fehlgeschlagen (Gast-Modus):", e.message);
      }
    }
  };

  const evalResult = useMemo(() => {
    if (game.status === 'gameover') {
      return evaluateMaxBlockScore(game.score, game.level, game.lines, maxBlockScores);
    }
    return null;
  }, [game.status, game.score, game.level, game.lines, maxBlockScores]);

  const renderMiniBlock = (type: BlockType) => {
    const shape = BLOCKS[type].shape;
    const colorClass = BLOCKS[type].color.split(' ')[0]; 
    return (
      <div 
        className="grid gap-[1px]" 
        style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`, gridTemplateRows: `repeat(${shape.length}, 1fr)` }}
      >
        {shape.map((row, y) => row.map((cell, x) => (
          <div key={`${y}-${x}`} className={`w-3 h-3 sm:w-4 sm:h-4 ${cell !== 0 ? colorClass : 'bg-transparent'}`} />
        )))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-[100dvh] z-[9999] flex flex-col bg-slate-100 overflow-hidden isolate">
      {view === 'lobby' && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header 100% identisch zu Sudoku - Zentriert auf Spielbreite (max-w-md) mit Zurück-Button links */}
          <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 pt-[max(env(safe-area-inset-top),0.5rem)] shadow-md sticky top-0 z-20">
            <div className="w-full max-w-md mx-auto flex items-center justify-between gap-2">
              <button 
                onClick={onClose} 
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors shadow-sm shrink-0"
              >
                ◀ Zurück
              </button>
              <h1 className="text-sm sm:text-base font-bold tracking-wide truncate">☕ {sessionTitle}</h1>
            </div>
          </div>

          {/* Main-Bereich extrem komprimiert */}
          <div className="p-3 sm:p-4 flex-1 w-full max-w-md mx-auto flex flex-col">
            
            {/* Game Tabs identisch zu Sudoku */}
            <div className="flex gap-2 mb-3">
              <button 
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-colors active:scale-95"
              >
                📝 Sudoku
              </button>
              <button className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl shadow-sm cursor-default">
                🧱 MaxBlock
              </button>
            </div>

            {/* Config Box extrem komprimiert */}
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

              {/* Sudoku-Style Schwierigkeits-Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-3 gap-1">
                {[
                  { id: 'easy', label: 'Leicht' },
                  { id: 'medium', label: 'Mittel' },
                  { id: 'hard', label: 'Schwer' },
                  { id: 'expert', label: 'Experte' }
                ].map(diff => (
                  <button
                    key={diff.id}
                    onClick={() => handleDifficultyChange(diff.id as any)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      difficulty === diff.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>

              {/* Dynamischer Stepper (nur sichtbar bei 'Experte') */}
              {difficulty === 'expert' && (
                <div className="flex items-center justify-center gap-3 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-100 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => handleExpertLevelChange(-1)}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded shadow-sm hover:bg-slate-100 active:scale-95 font-bold"
                  >
                    -
                  </button>
                  <div className="text-sm font-bold text-slate-700 min-w-[70px] text-center">
                    Level {expertLevel}
                  </div>
                  <button 
                    onClick={() => handleExpertLevelChange(1)}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-700 rounded shadow-sm hover:bg-slate-100 active:scale-95 font-bold"
                  >
                    +
                  </button>
                </div>
              )}

              {localBest > 0 && (
                <div className="text-center text-xs font-bold text-slate-500 mb-3">
                  Dein Rekord: <span className="text-blue-600">{localBest} Pkt</span>
                </div>
              )}

              <button 
                onClick={handleStartGame}
                className={`w-full py-3 text-white font-black text-base rounded-xl shadow-sm transition-colors active:scale-95 ${
                  gameMode === 'practice' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                ▶ Starten {gameMode === 'practice' ? '(Entspannt)' : ''}
              </button>
            </div>

            <MaxBlockLeaderboard currentUserId={user?.id} />

            {/* Steuerung ultradezent als Footer-Text ohne Riesen-Box */}
            <div className="mt-4 text-[10px] text-slate-400 text-center leading-relaxed mb-6">
              <strong>Steuerung Touch:</strong> Links tippen (Drehen), Rechts wischen (Bewegen/Drop), Doppeltipp Rechts (Hard-Drop).<br/>
              <strong>Desktop:</strong> Pfeiltasten/WASD (Bewegen/Drehen), Leertaste (Hard-Drop).
            </div>
          </div>
        </div>
      )}

      {view === 'playing' && (
        <div className="flex-1 h-[100dvh] flex flex-col text-white bg-slate-950">
          <div className="bg-slate-900 pt-[max(env(safe-area-inset-top),0.5rem)] shadow-md z-10 border-b border-slate-800 px-3 sm:px-4">
            <div className="w-full max-w-md mx-auto">
              <div className="pb-1.5 flex justify-between items-center">
                <button 
                  onClick={() => {
                    if (window.confirm('Spiel wirklich abbrechen? Dein Fortschritt geht verloren.')) {
                      setView('lobby');
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors"
                >
                  ◀ Abbrechen
                </button>
                {gameMode === 'practice' && (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-900/30 px-2 py-0.5 rounded">Übungsmodus</span>
                )}
              </div>
              
              <div className="pb-2.5 flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</div>
                  <div className="text-xl font-mono font-black text-emerald-400 leading-none">{game.score}</div>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Level</div>
                  <div className="text-lg font-black text-white leading-none">{game.level}</div>
                  <div className="text-[9px] text-slate-500 font-medium">{game.lines} Lines</div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Next</div>
                  <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {game.nextBlocks.map((type, i) => (
                      <div key={i} className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 ${i > 0 ? 'opacity-40 scale-75' : ''}`}>
                        {renderMiniBlock(type)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center p-2 overflow-hidden bg-slate-950">
            {game.status === 'gameover' && evalResult && (
              <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-300">
                <h2 className="text-4xl font-black text-rose-500 mb-2 tracking-widest uppercase drop-shadow-md">Game Over</h2>
                <div className="text-6xl mb-2 drop-shadow-lg">
                  {evalResult.medal === 'gold' ? '🏆' : evalResult.medal === 'silver' ? '🥈' : evalResult.medal === 'bronze' ? '🥉' : '🧱'}
                </div>
                <h3 className="text-2xl font-bold text-amber-400 mb-2">{evalResult.title}</h3>
                <p className="text-slate-300 text-sm mb-6 max-w-xs leading-relaxed">
                  {gameMode === 'practice' ? 'Übung macht den Meister! Im Ranked-Modus zählt dein Score für den lokalen Bestwert.' : evalResult.message}
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xs mb-8">
                  <div className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Final Score</div>
                  <div className="text-4xl font-mono font-black text-emerald-400 mb-2">{game.score}</div>
                  {gameMode === 'ranked' && game.score >= localBest && game.score > 0 && (
                    <div className="text-xs font-bold text-amber-400 mb-3 animate-pulse">🎉 Neuer persönlicher Rekord!</div>
                  )}
                  <div className="flex justify-between text-sm font-medium text-slate-300">
                    <span>Level {game.level}</span>
                    <span>{game.lines} Lines</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {evalResult.canRetroactivelySave && !hasSaved && gameMode === 'ranked' && (
                    <button 
                      onClick={handleSaveScore}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-lg rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>✍️</span> In die Hall of Fame
                    </button>
                  )}
                  <button 
                    onClick={() => setView('lobby')}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-transform active:scale-95"
                  >
                    {evalResult.canRetroactivelySave && !hasSaved && gameMode === 'ranked' ? 'Ohne Speichern zurück' : 'Zurück zur Lobby'}
                  </button>
                </div>
              </div>
            )}
            <div className="w-full max-w-[260px] sm:max-w-[320px] aspect-[1/2] max-h-[calc(100dvh-180px)] flex items-center justify-center">
              <MaxBlockBoard 
                board={game.board}
                activeBlock={game.activeBlock}
                getGhostPieceY={game.getGhostPieceY}
                status={game.status}
                showGhost={gameMode === 'practice'}
              />
            </div>
            <div className="absolute inset-0 z-20">
              <MaxBlockControls 
                onRotate={game.rotateBlock}
                onMoveHorizontal={game.moveHorizontal}
                onMoveDown={game.moveDown}
                onHardDrop={game.hardDrop}
                disabled={game.status !== 'playing'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---
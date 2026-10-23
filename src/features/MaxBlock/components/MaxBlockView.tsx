// src/features/MaxBlock/components/MaxBlockView.tsx
// [2026-10-23] - BUGFIX: Viewport-Höhe auf h-[100dvh] optimiert und Board-Container mit max-h versehen, um abgeschnittene Reihen auf Mobilgeräten zu verhindern.
// [2026-10-23] - FEATURE: Kompakteres Zwei-Spalten-Layout für die Lobby & lokalen Highscore (Personal Best via localStorage) hinzugefügt.
// [2026-10-23] - FEATURE: Modusauswahl (Ranked/Practice), Start-Level-Boost und Desktop-Steuerungs-Infos hinzugefügt.
// [2026-10-23] - FEATURE: Abbruch-Button in der Spielansicht (mit Bestätigung) hinzugefügt.
// [2026-10-23] - BUGFIX: Type-Only Imports für BlockType hinzugefügt.
// [2026-10-23] - FEATURE: Integration von Leaderboard und Evaluator (Gamification) in den Game-Over-Screen.
// [2026-10-23] - FEATURE: Haupt-Container für MaxBlock. Verbindet Headless-Engine, UI und Touch-Controls.
import React, { useState, useEffect, useMemo } from 'react';
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

export const MaxBlockView: React.FC<MaxBlockViewProps> = ({ onClose }) => {
  const [view, setView] = useState<'lobby' | 'playing'>('lobby');
  const [gameMode, setGameMode] = useState<'ranked' | 'practice'>('ranked');
  const [startLevel, setStartLevel] = useState<number>(1);
  const [hasSaved, setHasSaved] = useState(false);
  const [localBest, setLocalBest] = useState<number>(0);
  
  const game = useMaxBlockGame();
  
  const user = useClubStore(state => state.user);
  const maxBlockScores = useClubStore(state => state.maxBlockScores || []);
  const saveMaxBlockScore = useClubStore(state => state.saveMaxBlockScore);
  const fetchMaxBlockScores = useClubStore(state => state.fetchMaxBlockScores);

  // Lokalen Highscore beim Start aus dem localStorage laden
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_PB_KEY);
      if (saved) {
        setLocalBest(parseInt(saved, 10) || 0);
      }
    } catch (e) {
      console.error("Fehler beim Laden des lokalen Highscores:", e);
    }
  }, []);

  useEffect(() => {
    if (fetchMaxBlockScores) {
      fetchMaxBlockScores();
    }
  }, [fetchMaxBlockScores]);

  // Highscore bei Game Over im Ranked-Modus lokal prüfen und aktualisieren
  useEffect(() => {
    if (game.status === 'gameover' && game.score > 0 && gameMode === 'ranked') {
      if (game.score > localBest) {
        setLocalBest(game.score);
        try {
          localStorage.setItem(LOCAL_PB_KEY, game.score.toString());
        } catch (e) {
          console.error("Fehler beim Speichern des lokalen Highscores:", e);
        }
      }
    }
  }, [game.status, game.score, gameMode, localBest]);

  const handleStartGame = () => {
    setHasSaved(false);
    game.startGame(startLevel);
    setView('playing');
  };

  const handleSaveScore = async () => {
    if (user && game.score > 0 && !hasSaved && saveMaxBlockScore && gameMode === 'ranked') {
      setHasSaved(true);
      await saveMaxBlockScore({
        userId: user.id,
        userName: user.name,
        score: game.score,
        lines: game.lines,
        level: game.level,
        date: Date.now()
      });
      setView('lobby');
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
        style={{ 
          gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`,
          gridTemplateRows: `repeat(${shape.length}, 1fr)` 
        }}
      >
        {shape.map((row, y) => (
          row.map((cell, x) => (
            <div 
              key={`${y}-${x}`} 
              className={`w-3 h-3 sm:w-4 sm:h-4 ${cell !== 0 ? colorClass : 'bg-transparent'}`} 
            />
          ))
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen z-[9999] flex flex-col bg-slate-950 overflow-hidden isolate font-sans">
      {view === 'lobby' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center justify-start min-h-full p-4 sm:p-6 text-white relative pb-16">
            <button 
              onClick={onClose}
              className="absolute top-[max(env(safe-area-inset-top),1rem)] left-4 p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white z-10 text-sm"
            >
              ◀ Zurück
            </button>
            
            <div className="text-center mt-8 mb-6">
              <h1 className="text-3xl sm:text-4xl font-black mb-1 tracking-tighter bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-transparent bg-clip-text drop-shadow-sm">
                MAXBLOCK
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Beweise deine Reflexe</p>
              {localBest > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-bold text-amber-400 shadow-sm">
                  <span>🎯 Personal Best:</span>
                  <span className="font-mono">{localBest} Pkt</span>
                </div>
              )}
            </div>

            {/* Kompakteres Zwei-Spalten-Layout für Desktop */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              
              {/* Spalte 1: Spielmodus & Start-Level */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-slate-200 mb-3 text-center text-sm">Spielmodus</h2>
                  
                  <div className="flex bg-slate-950 p-1 rounded-xl mb-3 border border-slate-800/50">
                    <button
                      onClick={() => setGameMode('ranked')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        gameMode === 'ranked' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🏆 Wettkampf
                    </button>
                    <button
                      onClick={() => setGameMode('practice')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        gameMode === 'practice' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🧘 Üben
                    </button>
                  </div>

                  {gameMode === 'ranked' ? (
                    <div className="text-[11px] text-center text-amber-400 mb-4 bg-amber-900/20 p-2 rounded-lg border border-amber-900/50 leading-relaxed">
                      ⚠️ Geister-Schatten aus! Zählt für Hall of Fame & lokalen Highscore.
                    </div>
                  ) : (
                    <div className="text-[11px] text-center text-emerald-400 mb-4 bg-emerald-900/20 p-2 rounded-lg border border-emerald-900/50 leading-relaxed">
                      ℹ️ Geister-Schatten aktiv. Kein Eintrag in die Hall of Fame.
                    </div>
                  )}

                  <h2 className="font-bold text-slate-200 mb-3 text-center text-sm">Start-Level (Boost)</h2>
                  <div className="grid grid-cols-3 gap-2 mb-1">
                    {[1, 5, 10].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setStartLevel(lvl)}
                        className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-all border ${
                          startLevel === lvl 
                            ? 'bg-white text-slate-900 border-white shadow-sm' 
                            : 'bg-slate-950 text-slate-500 border-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        Level {lvl}
                      </button>
                    ))}
                  </div>
                  {startLevel > 1 && (
                    <p className="text-[10px] text-amber-400 text-center mt-1.5 font-medium">Höherer Start = {startLevel}x Multiplikator!</p>
                  )}
                </div>
              </div>

              {/* Spalte 2: Steuerung & Infos */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-slate-200 mb-3 text-center text-sm">Steuerung</h2>
                  
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Handy (Touch)</div>
                    <div className="flex justify-between gap-2 text-xs text-slate-400">
                      <div className="flex-1 text-center bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <span className="block text-base mb-0.5">🔄</span>
                        Links tippen <span className="text-[9px] text-slate-500">(1x Drehen, 2x Drop)</span>
                      </div>
                      <div className="flex-1 text-center bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <span className="block text-base mb-0.5">↔️</span>
                        Rechts wischen <span className="text-[9px] text-slate-500">(Bewegen / Drop)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mac / Desktop</div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 text-xs text-slate-400 text-center leading-relaxed">
                      <strong>Pfeiltasten / WASD</strong>: Bewegung & Rotation<br/>
                      <strong>Leertaste</strong>: Hard-Drop
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Start Button & Leaderboard zentriert */}
            <div className="w-full max-w-sm flex flex-col gap-4">
              <button 
                onClick={handleStartGame}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl shadow-lg transition-transform active:scale-95"
              >
                ▶ STARTEN
              </button>

              <MaxBlockLeaderboard />
            </div>

          </div>
        </div>
      )}

      {view === 'playing' && (
        <div className="flex-1 h-[100dvh] flex flex-col">
          {/* Header Dashboard */}
          <div className="bg-slate-900 text-white pt-[max(env(safe-area-inset-top),0.5rem)] shadow-md z-10 border-b border-slate-800">
            <div className="px-4 pb-1.5 flex justify-between items-center">
              <button 
                onClick={() => {
                  if (window.confirm('Spiel wirklich abbrechen? Dein Fortschritt geht verloren.')) {
                    setView('lobby');
                  }
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
              >
                ◀ Abbrechen
              </button>
              {gameMode === 'practice' && (
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-900/30 px-2 py-0.5 rounded">Übungsmodus</span>
              )}
            </div>
            
            <div className="px-4 pb-2.5 flex items-start justify-between">
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

          <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center p-2 overflow-hidden bg-slate-950">
            
            {game.status === 'gameover' && evalResult && (
              <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-300">
                <h2 className="text-4xl font-black text-rose-500 mb-2 tracking-widest uppercase drop-shadow-md">Game Over</h2>
                
                <div className="text-6xl mb-2 drop-shadow-lg">
                  {evalResult.medal === 'gold' ? '🏆' : evalResult.medal === 'silver' ? '🥈' : evalResult.medal === 'bronze' ? '🥉' : '🧱'}
                </div>
                
                <h3 className="text-2xl font-bold text-amber-400 mb-2">{evalResult.title}</h3>
                <p className="text-slate-300 text-sm mb-6 max-w-xs leading-relaxed">
                  {gameMode === 'practice' ? 'Übung macht den Meister! Im Wettkampf-Modus zählt dein Score für den lokalen Bestwert.' : evalResult.message}
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

            {/* Eingeschränkter Container, damit das Board auf Handys niemals abgeschnitten wird */}
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

// src/features/MaxBlock/utils/maxBlockScoreEvaluator.ts
// [2026-10-23] - FEATURE: Auswertungslogik für MaxBlock Scores (Gamification, Titel, Medaillen).
import type { ArcadeScore } from '../../../core/types/models';

export interface MaxBlockEvaluationResult {
  rank: number;
  medal: 'gold' | 'silver' | 'bronze' | 'none';
  title: string;
  message: string;
  canRetroactivelySave: boolean;
}

export function evaluateMaxBlockScore(
  score: number,
  level: number,
  lines: number,
  currentLeaderboard: ArcadeScore[]
): MaxBlockEvaluationResult {
  // Sortiere das aktuelle Leaderboard (Punkte absteigend, dann Level, dann Linien)
  const sortedLeaderboard = [...currentLeaderboard].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
    return (b.lines || 0) - (a.lines || 0);
  });

  // Bestimme den virtuellen Rang des neuen Scores
  let rank = 1;
  for (const entry of sortedLeaderboard) {
    if (score < (entry.score || 0)) {
      rank++;
    } else if (score === (entry.score || 0) && level < (entry.level || 0)) {
      rank++;
    } else if (score === (entry.score || 0) && level === (entry.level || 0) && lines < (entry.lines || 0)) {
      rank++;
    } else {
      break; // Wir haben unseren Platz gefunden
    }
  }

  let medal: 'gold' | 'silver' | 'bronze' | 'none' = 'none';
  let title = '';
  let message = '';

  if (rank === 1) {
    medal = 'gold';
    title = 'Vereinsmeister';
    message = 'Wahnsinn! Du bist der neue MaxBlock-Vereinsmeister. Die Halle verneigt sich vor dir!';
  } else if (rank === 2) {
    medal = 'silver';
    title = 'Vize-Meister';
    message = 'Knapp am Thron vorbei! Eine fantastische Leistung, die für Platz 2 reicht.';
  } else if (rank === 3) {
    medal = 'bronze';
    title = 'Podest-Stürmer';
    message = 'Starkes Spiel! Du hast dir einen Platz auf dem Treppchen gesichert.';
  } else if (rank <= 10) {
    title = 'Kreisliga-Legende';
    message = `Top 10! Mit Platz ${rank} gehörst du zur absoluten Elite des Vereins.`;
  } else if (level >= 5) {
    title = 'Block-Experte';
    message = `Platz ${rank}. Solide Leistung und Level ${level} erreicht! Das Training zahlt sich aus.`;
  } else {
    title = 'Block-Lehrling';
    message = `Platz ${rank}. Ein guter Anfang! Mit etwas mehr Übung kletterst du in der Tabelle weiter nach oben.`;
  }

  // Speichern erlauben, solange mindestens eine Reihe aufgelöst wurde (Score > 0)
  const canRetroactivelySave = score > 0;

  return {
    rank,
    medal,
    title,
    message,
    canRetroactivelySave
  };
}
// --- END OF FILE ---

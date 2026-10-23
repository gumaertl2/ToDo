// src/features/Sudoku/utils/scoreEvaluator.ts
// [2026-10-23] - FEATURE: Logik-Engine für Sudoku Gamification (Rang-Berechnung & Motivations-Sprüche).
import type { ArcadeScore } from '../../../core/types/models';

export interface EvaluationResult {
  rank: number;
  rawRank: number;
  medal: 'gold' | 'silver' | 'bronze' | null;
  message: string;
  canRetroactivelySave: boolean;
}

export const evaluateScore = (
  timeInSeconds: number,
  penaltySeconds: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'expert',
  gameMode: 'ranked' | 'practice',
  hasUsedPause: boolean,
  allScores: ArcadeScore[]
): EvaluationResult => {
  // 1. Relevante Scores filtern und sortieren (ohne den aktuell laufenden, falls noch nicht gespeichert)
  const activeScores = allScores
    .filter(s => s.game === 'SUDOKU' && s.difficulty === difficulty && !s.isArchived)
    .sort((a, b) => a.timeInSeconds - b.timeInSeconds);

  // 2. Echten Rang berechnen
  let rank = 1;
  for (const s of activeScores) {
    if (timeInSeconds <= s.timeInSeconds) break; // <= damit man bei gleicher Zeit davor landet (neu ist besser)
    rank++;
  }

  // 3. Potenziellen Rang berechnen (Was-wäre-wenn ohne Strafen)
  const rawTime = Math.max(0, timeInSeconds - penaltySeconds);
  let rawRank = 1;
  for (const s of activeScores) {
    if (rawTime <= s.timeInSeconds) break;
    rawRank++;
  }

  // 4. Medaillen-Zuweisung
  let medal: 'gold' | 'silver' | 'bronze' | null = null;
  if (rank === 1) medal = 'gold';
  else if (rank === 2) medal = 'silver';
  else if (rank === 3) medal = 'bronze';

  // 5. Deltas berechnen (Abstand zu Platz 1, 2 und 3)
  const deltaTo1 = activeScores[0] ? timeInSeconds - activeScores[0].timeInSeconds : 0;
  const deltaTo3 = activeScores[2] ? timeInSeconds - activeScores[2].timeInSeconds : 0;

  // 6. Nachrichten generieren
  let message = '';
  let canRetroactivelySave = false;

  if (hasUsedPause) {
    message = 'Du hast pausiert. Ohne Pause wärst du auf Platz ' + rank + ' gelandet!';
  } else if (gameMode === 'practice') {
    if (rank <= 10) {
      canRetroactivelySave = true;
      if (rank <= 3) {
        message = `Undercover unterwegs? Deine 'Trainingsrunde' war so stark wie ein echtes Punktspiel und reicht direkt für Platz ${rank}! Sollen wir das offiziell werten?`;
      } else {
        message = `Trainingsweltmeister! Diese Zeit bringt dich auf Anhieb in die Top 10 (Platz ${rank}). Sollen wir das Ergebnis in die Hall of Fame eintragen?`;
      }
    } else {
      message = `Gutes Training! Für die Top 10 musst du allerdings noch etwas schneller werden. Platz ${rank} wäre es aktuell.`;
    }
  } else {
    // Ranked Modus
    if (penaltySeconds > 0 && rawRank < rank) {
      // Der "Was-wäre-wenn" Motivator
      if (rawRank <= 3) {
        message = `Zu schnell geklickt! Deine reine Spielzeit war gigantisch. Ohne die ${penaltySeconds} Sekunden Strafe wärst du jetzt auf Platz ${rawRank} gelandet. Nächstes Mal mit mehr Schnitt und weniger Fehlern!`;
      } else {
        message = `Deine Fehler/Tipps haben dich ein bisschen Zeit gekostet (wie ein leichter Aufschlagfehler). Ohne Strafzeit hättest du direkt Platz ${rawRank} geholt. Du hast das absolut drauf!`;
      }
    } else {
      // Reguläres Podium & Top 10
      if (rank === 1) {
        message = activeScores.length === 0 
          ? '🏆 Matchball verwandelt! Du bist der erste Vereinsmeister in dieser Schwierigkeitsstufe!'
          : '🏆 Matchball verwandelt! Ein lupenreiner Topspin-Sieg – du bist der neue Vereinsmeister!';
      } else if (rank === 2) {
        message = `🥈 Silber! Was für ein starker Auftritt. Nur noch winzige ${deltaTo1} Sekunden fehlen zum Meistertitel – im nächsten Satz holst du dir Gold!`;
      } else if (rank === 3) {
        message = '🥉 Bronze! Ein echter Kantenball ins Glück. Super Leistung, du hast dir das Treppchen absolut verdient!';
      } else if (rank === 4) {
        message = `Uff! So knapp wie ein Netzroller: Nur ${deltaTo3} Sekunden schneller und du wärst direkt in die Medaillenränge (Platz 3) gerutscht. Das hast du beim nächsten Mal!`;
      } else if (rank <= 10) {
        message = `🏅 Platz ${rank}! Starker Aufschlag, du hast dich offiziell in die Top 10 gespielt. Das Treppchen ist in Sichtweite!`;
      } else {
        message = `Solide Leistung auf Platz ${rank}! Bleib dran, mit ein bisschen Training knackst du bald die Top 10.`;
      }
    }
  }

  return {
    rank,
    rawRank,
    medal,
    message,
    canRetroactivelySave
  };
};
// --- END OF FILE ---

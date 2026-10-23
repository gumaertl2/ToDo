// src/features/MaxBlock/components/MaxBlockControls.tsx
// [2026-10-23] - BUGFIX: Tippfehler 'Date.Now' zu 'Date.now()' korrigiert, um Build-Fehler zu beheben.
// [2026-10-23] - TWEAK: Zonenaufteilung auf 1/3 links (Rotation) und 2/3 rechts (Swipe/Doppelklick-Drop) angepasst.
// [2026-10-23] - BUGFIX: Browser-Wischgesten (Zurück/Vorwärts) während des Spiels per touch-action und overscroll unterdrückt.
// [2026-10-23] - FEATURE: Tastatursteuerung (Pfeiltasten/WASD + Leertaste) für Mac/Desktop hinzugefügt.
import React, { useRef, useEffect } from 'react';

interface MaxBlockControlsProps {
  onRotate: () => void;
  onMoveHorizontal: (direction: -1 | 1) => void;
  onMoveDown: () => void;
  onHardDrop: () => void;
  disabled: boolean;
}

export const MaxBlockControls: React.FC<MaxBlockControlsProps> = ({
  onRotate,
  onMoveHorizontal,
  onMoveDown,
  onHardDrop,
  disabled
}) => {
  const touchState = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0
  });

  const lastRightTapRef = useRef<number>(0);

  const SWIPE_X_THRESHOLD = 30;
  const SWIPE_Y_THRESHOLD = 35; 
  const HARD_DROP_VELOCITY_TIME = 300;
  const HARD_DROP_DISTANCE = 45;

  // Tastatursteuerung für Mac/Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          onMoveHorizontal(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          onMoveHorizontal(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          onMoveDown();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          onRotate();
          break;
        case ' ':
          e.preventDefault();
          onHardDrop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onMoveHorizontal, onMoveDown, onRotate, onHardDrop]);

  const handleRightTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      startTime: Date.now()
    };

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastRightTapRef.current < DOUBLE_TAP_DELAY) {
      onHardDrop();
      lastRightTapRef.current = 0;
    } else {
      lastRightTapRef.current = now;
    }
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    if (e.cancelable) {
      e.preventDefault(); // Verhindert das Scrollen & Browser-Wischgesten
    }
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.current.lastX;
    const deltaY = touch.clientY - touchState.current.lastY;

    if (deltaX > SWIPE_X_THRESHOLD) {
      onMoveHorizontal(1);
      touchState.current.lastX = touch.clientX;
    } else if (deltaX < -SWIPE_X_THRESHOLD) {
      onMoveHorizontal(-1);
      touchState.current.lastX = touch.clientX;
    }

    if (deltaY > SWIPE_Y_THRESHOLD) {
      onMoveDown();
      touchState.current.lastY = touch.clientY;
    }
  };

  const handleRightTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.changedTouches[0];
    const totalDeltaY = touch.clientY - touchState.current.startY;
    const totalTime = Date.now() - touchState.current.startTime;

    if (totalDeltaY > HARD_DROP_DISTANCE && totalTime < HARD_DROP_VELOCITY_TIME) {
      onHardDrop();
    }
  };

  const handleLeftTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    if (e.cancelable) e.preventDefault();
    onRotate();
  };

  return (
    <div 
      className="absolute inset-0 z-20 flex touch-none select-none" 
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      {/* Linke Zone (1/3 des Bildschirms): Exklusiv für Rotation */}
      <div 
        className="w-1/3 h-full"
        onTouchStart={handleLeftTouchStart}
      />
      
      {/* Rechte Zone (2/3 des Bildschirms): Für Bewegung, Wisch-Drops und Hard Drop per Doppelklick */}
      <div 
        className="w-2/3 h-full"
        onTouchStart={handleRightTouchStart}
        onTouchMove={handleRightTouchMove}
        onTouchEnd={handleRightTouchEnd}
      />
    </div>
  );
};
// --- END OF FILE ---

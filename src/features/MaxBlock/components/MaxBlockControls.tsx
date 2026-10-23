// src/features/MaxBlock/components/MaxBlockControls.tsx
// [2026-10-23] - BUGFIX: Doppelte Rotation durch Entfernen des redundanten onMouseDown behoben & Double-Tap (Doppelklick links) für Hard Drop ergänzt.
// [2026-10-23] - FEATURE: Tastatursteuerung (Pfeiltasten/WASD + Leertaste) für Mac/Desktop hinzugefügt.
// [2026-10-23] - FEATURE: Zwei-Daumen Touch-Overlay für MaxBlock (Links: Rotation / Double-Tap Hard Drop, Rechts: Relative Swipe-Steuerung).
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

  const lastTapRef = useRef<number>(0);

  // Schwellenwerte für das "Einrasten" (Pixel pro Spalte/Reihe)
  const SWIPE_X_THRESHOLD = 35;
  const SWIPE_Y_THRESHOLD = 40; 
  
  // Schwellenwerte für den Hard Drop (Flick)
  const HARD_DROP_VELOCITY_TIME = 300; // ms
  const HARD_DROP_DISTANCE = 50; // px

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
        case ' ': // Leertaste für Hard Drop
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
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    if (e.cancelable) {
      e.preventDefault();
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
    e.preventDefault(); 

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Doppelklick / Double-Tap links -> Hard Drop!
      onHardDrop();
      lastTapRef.current = 0;
    } else {
      // Einfacher Tap links -> Rotation
      onRotate();
      lastTapRef.current = now;
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex touch-none">
      {/* Linke Daumen-Zone: Rotation (1x) & Hard Drop (Doppelklick / Double-Tap) */}
      <div 
        className="w-1/2 h-full"
        onTouchStart={handleLeftTouchStart}
      />
      
      {/* Rechte Daumen-Zone: Für Bewegung und Drops */}
      <div 
        className="w-1/2 h-full"
        onTouchStart={handleRightTouchStart}
        onTouchMove={handleRightTouchMove}
        onTouchEnd={handleRightTouchEnd}
      />
    </div>
  );
};
// --- END OF FILE ---

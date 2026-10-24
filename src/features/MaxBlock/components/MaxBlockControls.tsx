// src/features/MaxBlock/components/MaxBlockControls.tsx
// [2026-10-24] - UX-FIX: System-Popups (Nachschlagen, Übersetzen, Kopieren, Kontextmenü, Textauswahl-Lupe) auf iPad, iPhone und Android-Touchgeräten durch native non-passive Touch-Listener, WebkitTouchCallout-Sperre und globale Selection-Blockade während des Spiels komplett deaktiviert.
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
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const rightZoneRef = useRef<HTMLDivElement>(null);

  const touchState = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0
  });

  const lastRightTapRef = useRef<number>(0);

  // Aktuelle Callbacks in Refs halten, damit die nativen Touch-Listener (passive: false) nicht ständig neu gebunden werden müssen
  const callbacksRef = useRef({
    onRotate,
    onMoveHorizontal,
    onMoveDown,
    onHardDrop,
    disabled
  });

  useEffect(() => {
    callbacksRef.current = {
      onRotate,
      onMoveHorizontal,
      onMoveDown,
      onHardDrop,
      disabled
    };
  }, [onRotate, onMoveHorizontal, onMoveDown, onHardDrop, disabled]);

  const SWIPE_X_THRESHOLD = 30;
  const SWIPE_Y_THRESHOLD = 35; 
  const HARD_DROP_VELOCITY_TIME = 300;
  const HARD_DROP_DISTANCE = 45;

  // Globale Unterdrückung von Textauswahl, Nachschlagen/Übersetzen und Kontextmenüs (iPad, iPhone, Android) während des Spiels
  useEffect(() => {
    if (disabled) return;

    const bodyStyle = document.body.style as any;
    const prevUserSelect = bodyStyle.userSelect;
    const prevWebkitUserSelect = bodyStyle.webkitUserSelect;
    const prevWebkitTouchCallout = bodyStyle.webkitTouchCallout;

    bodyStyle.userSelect = 'none';
    bodyStyle.webkitUserSelect = 'none';
    bodyStyle.webkitTouchCallout = 'none';

    const preventNativeMenu = (e: Event) => {
      e.preventDefault();
    };

    const clearAnySelection = () => {
      const sel = window.getSelection?.();
      if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges();
      }
    };

    window.addEventListener('contextmenu', preventNativeMenu, { passive: false });
    document.addEventListener('selectstart', preventNativeMenu, { passive: false });
    document.addEventListener('selectionchange', clearAnySelection);

    return () => {
      bodyStyle.userSelect = prevUserSelect;
      bodyStyle.webkitUserSelect = prevWebkitUserSelect;
      bodyStyle.webkitTouchCallout = prevWebkitTouchCallout;

      window.removeEventListener('contextmenu', preventNativeMenu);
      document.removeEventListener('selectstart', preventNativeMenu);
      document.removeEventListener('selectionchange', clearAnySelection);
    };
  }, [disabled]);

  // Native non-passive Touch-Listener für iOS/iPadOS/Android (verhindert Long-Press Lupe & "Nachschlagen/Übersetzen" zu 100%)
  useEffect(() => {
    const leftEl = leftZoneRef.current;
    const rightEl = rightZoneRef.current;
    if (!leftEl || !rightEl) return;

    const handleLeftStart = (e: TouchEvent) => {
      if (callbacksRef.current.disabled) return;
      if (e.cancelable) e.preventDefault();
      callbacksRef.current.onRotate();
    };

    const handleLeftMoveOrEnd = (e: TouchEvent) => {
      if (callbacksRef.current.disabled) return;
      if (e.cancelable) e.preventDefault();
    };

    const handleRightStart = (e: TouchEvent) => {
      if (callbacksRef.current.disabled) return;
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      if (!touch) return;

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
        callbacksRef.current.onHardDrop();
        lastRightTapRef.current = 0;
      } else {
        lastRightTapRef.current = now;
      }
    };

    const handleRightMove = (e: TouchEvent) => {
      if (callbacksRef.current.disabled) return;
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchState.current.lastX;
      const deltaY = touch.clientY - touchState.current.lastY;

      if (deltaX > SWIPE_X_THRESHOLD) {
        callbacksRef.current.onMoveHorizontal(1);
        touchState.current.lastX = touch.clientX;
      } else if (deltaX < -SWIPE_X_THRESHOLD) {
        callbacksRef.current.onMoveHorizontal(-1);
        touchState.current.lastX = touch.clientX;
      }

      if (deltaY > SWIPE_Y_THRESHOLD) {
        callbacksRef.current.onMoveDown();
        touchState.current.lastY = touch.clientY;
      }
    };

    const handleRightEnd = (e: TouchEvent) => {
      if (callbacksRef.current.disabled) return;
      if (e.cancelable) e.preventDefault();

      const touch = e.changedTouches[0];
      if (!touch) return;

      const totalDeltaY = touch.clientY - touchState.current.startY;
      const totalTime = Date.now() - touchState.current.startTime;

      if (totalDeltaY > HARD_DROP_DISTANCE && totalTime < HARD_DROP_VELOCITY_TIME) {
        callbacksRef.current.onHardDrop();
      }
    };

    leftEl.addEventListener('touchstart', handleLeftStart, { passive: false });
    leftEl.addEventListener('touchmove', handleLeftMoveOrEnd, { passive: false });
    leftEl.addEventListener('touchend', handleLeftMoveOrEnd, { passive: false });

    rightEl.addEventListener('touchstart', handleRightStart, { passive: false });
    rightEl.addEventListener('touchmove', handleRightMove, { passive: false });
    rightEl.addEventListener('touchend', handleRightEnd, { passive: false });

    return () => {
      leftEl.removeEventListener('touchstart', handleLeftStart);
      leftEl.removeEventListener('touchmove', handleLeftMoveOrEnd);
      leftEl.removeEventListener('touchend', handleLeftMoveOrEnd);

      rightEl.removeEventListener('touchstart', handleRightStart);
      rightEl.removeEventListener('touchmove', handleRightMove);
      rightEl.removeEventListener('touchend', handleRightEnd);
    };
  }, []);

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

  const touchLockStyle: React.CSSProperties = {
    touchAction: 'none',
    overscrollBehavior: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent'
  };

  return (
    <div 
      className="absolute inset-0 z-20 flex touch-none select-none" 
      style={touchLockStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Linke Zone (1/3 des Bildschirms): Exklusiv für Rotation */}
      <div 
        ref={leftZoneRef}
        className="w-1/3 h-full select-none"
        style={touchLockStyle}
      />
      
      {/* Rechte Zone (2/3 des Bildschirms): Für Bewegung, Wisch-Drops und Hard Drop per Doppelklick */}
      <div 
        ref={rightZoneRef}
        className="w-2/3 h-full select-none"
        style={touchLockStyle}
      />
    </div>
  );
};
// --- END OF FILE ---

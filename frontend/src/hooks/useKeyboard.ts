import { useEffect } from 'react';
import { useMissionStore } from '../store/useMissionStore';

export function useKeyboard(): void {
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const setIsPlaying = useMissionStore((s) => s.setIsPlaying);
  const stepForward = useMissionStore((s) => s.stepForward);
  const stepBackward = useMissionStore((s) => s.stepBackward);
  const resetPlayback = useMissionStore((s) => s.resetPlayback);
  const isZoomOpen = useMissionStore((s) => s.isZoomOpen);
  const closeZoom = useMissionStore((s) => s.closeZoom);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing into input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Escape') {
        if (isZoomOpen) {
          e.preventDefault();
          closeZoom();
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackward();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetPlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setIsPlaying, stepForward, stepBackward, resetPlayback, isZoomOpen, closeZoom]);
}

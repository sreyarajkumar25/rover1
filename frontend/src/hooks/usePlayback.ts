import { useEffect } from 'react';
import { useMissionStore } from '../store/useMissionStore';

export function usePlayback(): void {
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const stepForward = useMissionStore((s) => s.stepForward);

  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      stepForward();
    }, playbackSpeed);

    return () => clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, stepForward]);
}

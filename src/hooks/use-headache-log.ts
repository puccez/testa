import { useCallback, useEffect, useState } from 'react';

import {
  HeadacheLog,
  HeadacheSlot,
  clearHeadacheLog,
  loadHeadacheLog,
  saveHeadacheIntensity,
} from '@/lib/headache-log';

export function useHeadacheLog() {
  const [log, setLog] = useState<HeadacheLog>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextLog = await loadHeadacheLog();
    setLog(nextLog);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Hydrates persisted local data after mount; there is no synchronous AsyncStorage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const recordIntensity = useCallback(
    async (slot: HeadacheSlot, intensity: number) => {
      const nextLog = await saveHeadacheIntensity(slot, intensity);
      setLog(nextLog);
    },
    []
  );

  const clear = useCallback(async () => {
    await clearHeadacheLog();
    setLog({});
  }, []);

  return {
    clear,
    isLoading,
    log,
    recordIntensity,
    refresh,
  };
}

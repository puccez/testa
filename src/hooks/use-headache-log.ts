import { useCallback, useEffect, useState } from 'react';

import {
  HeadacheLog,
  HeadacheSlot,
  clearHeadacheLog,
  loadHeadacheLog,
  saveHeadacheIntensity,
  saveHeadacheMedication,
} from '@/lib/headache-log';

type HeadacheLogListener = (log: HeadacheLog) => void;

const listeners = new Set<HeadacheLogListener>();

let cachedLog: HeadacheLog = {};
let hasLoadedLog = false;
let mutationVersion = 0;
let pendingRefresh: Promise<HeadacheLog> | undefined;

function publishLog(nextLog: HeadacheLog) {
  cachedLog = nextLog;
  hasLoadedLog = true;

  listeners.forEach((listener) => listener(nextLog));
}

async function refreshCachedLog() {
  const refreshMutationVersion = mutationVersion;

  pendingRefresh ??= loadHeadacheLog()
    .then((nextLog) => {
      if (refreshMutationVersion === mutationVersion) {
        publishLog(nextLog);
      }

      return cachedLog;
    })
    .finally(() => {
      pendingRefresh = undefined;
    });

  return pendingRefresh;
}

export function useHeadacheLog() {
  const [log, setLog] = useState<HeadacheLog>(cachedLog);
  const [isLoading, setIsLoading] = useState(!hasLoadedLog);

  const refresh = useCallback(async () => {
    const nextLog = await refreshCachedLog();
    setIsLoading(false);
    return nextLog;
  }, []);

  useEffect(() => {
    function handleLogChange(nextLog: HeadacheLog) {
      setLog(nextLog);
      setIsLoading(false);
    }

    listeners.add(handleLogChange);

    if (hasLoadedLog) {
      handleLogChange(cachedLog);
      return () => {
        listeners.delete(handleLogChange);
      };
    }

    // Hydrates persisted local data after mount; there is no synchronous AsyncStorage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    return () => {
      listeners.delete(handleLogChange);
    };
  }, [refresh]);

  const recordIntensity = useCallback(
    async (slot: HeadacheSlot, intensity: number) => {
      const nextLog = await saveHeadacheIntensity(slot, intensity);
      mutationVersion += 1;
      publishLog(nextLog);
    },
    []
  );

  const recordMedication = useCallback(
    async (slot: HeadacheSlot, medication: string, dateKey: string) => {
      const nextLog = await saveHeadacheMedication(slot, medication, dateKey);
      mutationVersion += 1;
      publishLog(nextLog);
    },
    []
  );

  const clear = useCallback(async () => {
    await clearHeadacheLog();
    mutationVersion += 1;
    publishLog({});
  }, []);

  return {
    clear,
    isLoading,
    log,
    recordMedication,
    recordIntensity,
    refresh,
  };
}

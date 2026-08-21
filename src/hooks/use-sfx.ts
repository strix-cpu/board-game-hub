import { useCallback, useEffect, useState } from "react";
import { initSfxPreference, isMuted, playSfx, setMuted, subscribeMuted, type SfxName } from "@/lib/sfx";

export function useSfx() {
  return useCallback((name: SfxName) => playSfx(name), []);
}

export function useSfxMuted(): [boolean, () => void] {
  const [muted, setLocal] = useState(false);

  useEffect(() => {
    initSfxPreference();
    setLocal(isMuted());
    return subscribeMuted(setLocal);
  }, []);

  const toggle = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    if (!next) playSfx("click");
  }, []);

  return [muted, toggle];
}

/** Fires `onChange(prev, next)` whenever the tracked value changes (skips first render). */
export function useChangeEffect<T>(value: T, onChange: (prev: T, next: T) => void) {
  const [prev, setPrev] = useState(value);
  useEffect(() => {
    if (Object.is(prev, value)) return;
    onChange(prev, value);
    setPrev(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

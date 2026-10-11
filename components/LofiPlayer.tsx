"use client";

import { useEffect } from "react";
import { startLofi, stopLofi } from "@/lib/lofi";
import { useStore } from "@/lib/store";

/** Keeps the lofi engine in step with the store: plays while music is on, and the sound toggle mutes it too. */
export function LofiPlayer() {
  const playing = useStore((s) => s.musicOn && s.soundOn);
  useEffect(() => {
    if (playing) startLofi();
    else stopLofi();
  }, [playing]);
  useEffect(() => () => stopLofi(), []);
  return null;
}

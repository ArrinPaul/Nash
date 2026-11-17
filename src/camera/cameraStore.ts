import { create } from 'zustand';
import type { Move } from '../data/types';
import { getCameraPreference, setCameraPreference } from './handTracker';

/**
 * Camera mode lives outside any single round so the camera starts once and stays on:
 * hand and manual input are always both live, nobody picks a mode each round.
 */
interface CameraState {
  /** Panel visible and tracking. On by default; "Off" is remembered for the session. */
  enabled: boolean;
  /** True once SHOOT is up and nothing has been thrown: only then does a held pose count. */
  armed: boolean;
  /** The active round's throw handler, registered by RoundScreen. */
  throwMove: ((move: Move) => void) | null;
  setEnabled: (on: boolean) => void;
  setArmed: (armed: boolean) => void;
  register: (handler: ((move: Move) => void) | null) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  enabled: getCameraPreference(),
  armed: false,
  throwMove: null,
  setEnabled: (on) => {
    setCameraPreference(on);
    set({ enabled: on });
  },
  setArmed: (armed) => set({ armed }),
  register: (handler) => set({ throwMove: handler }),
}));

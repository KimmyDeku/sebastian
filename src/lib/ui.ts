"use client";
import { create } from "zustand";

/** Desktop sidebar: open or collapsed behind the hamburger button. Remembered on this device. */
const saved = () => { try { return localStorage.getItem("sebastian-sidebar") !== "closed"; } catch { return true; } };

export const useUI = create<{ sidebar: boolean; ready: boolean; init: () => void; setSidebar: (open: boolean) => void }>((set) => ({
  sidebar: true,
  ready: false,
  init: () => set({ sidebar: saved(), ready: true }),
  setSidebar: (open) => { try { localStorage.setItem("sebastian-sidebar", open ? "open" : "closed"); } catch {} set({ sidebar: open }); },
}));

"use client";
// Loads the Google Maps JavaScript API once. Needs NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
// (a separate key restricted to your website's address).
let loading: Promise<any> | null = null;
let authFailed = false;

export const googleMapsKey = () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || "";

export function loadGoogleMaps(): Promise<any> {
  const w = window as any;
  if (authFailed) return Promise.reject(new Error("auth"));
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google);
  const key = googleMapsKey();
  if (!key) return Promise.reject(new Error("no-key"));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      w.__sebastianMapsReady = () => resolve(w.google);
      w.gm_authFailure = () => { authFailed = true; reject(new Error("auth")); window.dispatchEvent(new Event("sebastian-maps-auth")); };
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__sebastianMapsReady`;
      s.async = true;
      s.onerror = () => { loading = null; reject(new Error("load")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

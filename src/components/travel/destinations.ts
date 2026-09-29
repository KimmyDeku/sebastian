export const ACTIVITIES = ["Beaches", "Food & dining", "History & culture", "Nature & hiking", "Wildlife & safari", "Diving & snorkelling", "Wellness", "Museums", "Nightlife", "Shopping", "Adventure", "Family friendly"];

export const DESTINATIONS = [
  { name: "Cape Town, South Africa", lat: -33.92, lng: 18.42, tags: ["Beaches", "Food & dining", "Nature & hiking", "Wildlife & safari"], note: "Mountain, ocean and winelands in one trip." },
  { name: "Victoria Falls, Zimbabwe", lat: -17.93, lng: 25.84, tags: ["Adventure", "Nature & hiking", "Wildlife & safari"], note: "The smoke that thunders, with sunset cruises." },
  { name: "Zanzibar, Tanzania", lat: -6.16, lng: 39.2, tags: ["Beaches", "Diving & snorkelling", "History & culture", "Wellness"], note: "Spice markets and turquoise shallows." },
  { name: "Serengeti, Tanzania", lat: -2.33, lng: 34.83, tags: ["Wildlife & safari", "Adventure", "Family friendly"], note: "The great migration, up close." },
  { name: "Marrakech, Morocco", lat: 31.63, lng: -8.0, tags: ["Shopping", "History & culture", "Food & dining"], note: "Souks, riads and the Atlas on the horizon." },
  { name: "Mauritius", lat: -20.35, lng: 57.55, tags: ["Beaches", "Diving & snorkelling", "Wellness", "Family friendly"], note: "Lagoons, reefs and gentle luxury." },
  { name: "Lisbon, Portugal", lat: 38.72, lng: -9.14, tags: ["Food & dining", "History & culture", "Nightlife"], note: "Tiled streets, trams and pastéis de nata." },
  { name: "Barcelona, Spain", lat: 41.39, lng: 2.17, tags: ["Beaches", "Nightlife", "Museums", "Food & dining"], note: "Gaudí, tapas and the Mediterranean." },
  { name: "Paris, France", lat: 48.86, lng: 2.35, tags: ["Museums", "Food & dining", "Shopping", "History & culture"], note: "The classic, still worth it." },
  { name: "Rome, Italy", lat: 41.9, lng: 12.5, tags: ["History & culture", "Food & dining", "Museums"], note: "Two thousand years on every corner." },
  { name: "Santorini, Greece", lat: 36.39, lng: 25.46, tags: ["Beaches", "Wellness", "Food & dining"], note: "White villages above a blue caldera." },
  { name: "Reykjavik, Iceland", lat: 64.15, lng: -21.94, tags: ["Nature & hiking", "Adventure", "Wellness"], note: "Glaciers, geysers and the northern lights." },
  { name: "Dubai, UAE", lat: 25.2, lng: 55.27, tags: ["Shopping", "Family friendly", "Nightlife", "Adventure"], note: "Desert dunes and skyline dining." },
  { name: "Maldives", lat: 3.2, lng: 73.22, tags: ["Beaches", "Diving & snorkelling", "Wellness"], note: "Overwater villas and coral gardens." },
  { name: "Bali, Indonesia", lat: -8.41, lng: 115.19, tags: ["Wellness", "Beaches", "Nature & hiking", "Diving & snorkelling"], note: "Rice terraces and gentle beaches." },
  { name: "Kyoto, Japan", lat: 35.01, lng: 135.77, tags: ["History & culture", "Food & dining", "Wellness"], note: "Temples, tea houses and quiet gardens." },
  { name: "Costa Rica", lat: 9.75, lng: -83.75, tags: ["Wildlife & safari", "Nature & hiking", "Adventure", "Beaches"], note: "Rainforest, toucans and two coastlines." },
  { name: "Queenstown, New Zealand", lat: -45.03, lng: 168.66, tags: ["Adventure", "Nature & hiking"], note: "Lakes, peaks and plenty of adrenaline." },
];

/** The interests shown on the travel collage, placed over each photo (percent of the image). */
export const COLLAGE_SPOTS = [
  { key: "Beaches", label: "Beaches", x: 51, y: 13.5, r: 13.5 },
  { key: "Wildlife & safari", label: "Wildlife", x: 80.5, y: 26.5, r: 13 },
  { key: "Wellness", label: "Wellness", x: 19, y: 25.5, r: 13 },
  { key: "Food & dining", label: "Food", x: 85.5, y: 51.5, r: 11 },
  { key: "History & culture", label: "Culture", x: 16.5, y: 64.5, r: 12 },
  { key: "Nature & hiking", label: "Hiking", x: 44.5, y: 84, r: 13 },
  { key: "Diving & snorkelling", label: "Diving", x: 75, y: 76, r: 12.5 },
];

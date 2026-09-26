import { fetchJSON } from "./http";

export interface WeatherDay { date: string; max: number; min: number; code: number; label: string; precip: number }
export interface WeatherReport { place: string; country?: string; lat: number; lng: number; current: { temp: number; label: string; wind: number; humidity: number }; days: WeatherDay[]; alerts: string[]; provider: string; fetchedAt: string }

const WMO: Record<number, string> = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Heavy showers", 82: "Violent showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Severe thunderstorm" };

export async function geocode(name: string) {
  const g = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name.split(",")[0])}&count=1&language=en`);
  const r = g.results?.[0];
  if (!r) throw new Error(`I couldn't locate "${name}".`);
  return { name: r.name as string, country: r.country as string, lat: r.latitude as number, lng: r.longitude as number };
}

function advisories(days: WeatherDay[], wind: number) {
  const a: string[] = [];
  days.forEach((d) => {
    if (d.precip >= 80) a.push(`${d.date}: high chance of rain (${d.precip}%) — plan indoor options.`);
    if (d.max >= 35) a.push(`${d.date}: very hot (${Math.round(d.max)}°C) — stay hydrated, avoid midday sun.`);
    if (d.min <= 0) a.push(`${d.date}: freezing overnight (${Math.round(d.min)}°C).`);
    if ([95, 96, 99].includes(d.code)) a.push(`${d.date}: thunderstorms forecast.`);
  });
  if (wind >= 50) a.push(`Strong winds right now (${Math.round(wind)} km/h).`);
  return a.slice(0, 5);
}

async function openMeteo(lat: number, lng: number) {
  const f = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`);
  const days: WeatherDay[] = f.daily.time.map((t: string, i: number) => ({
    date: t, max: f.daily.temperature_2m_max[i], min: f.daily.temperature_2m_min[i], code: f.daily.weather_code[i],
    label: WMO[f.daily.weather_code[i]] || "—", precip: f.daily.precipitation_probability_max?.[i] ?? 0,
  }));
  return { current: { temp: f.current.temperature_2m, label: WMO[f.current.weather_code] || "—", wind: f.current.wind_speed_10m, humidity: f.current.relative_humidity_2m }, days, provider: "Open-Meteo" };
}

async function googleWeather(lat: number, lng: number, key: string) {
  const base = `location.latitude=${lat}&location.longitude=${lng}&key=${key}`;
  const [c, d] = await Promise.all([
    fetchJSON(`https://weather.googleapis.com/v1/currentConditions:lookup?${base}`),
    fetchJSON(`https://weather.googleapis.com/v1/forecast/days:lookup?${base}&days=7`),
  ]);
  const days: WeatherDay[] = (d.forecastDays || []).map((x: any) => ({
    date: `${x.displayDate.year}-${String(x.displayDate.month).padStart(2, "0")}-${String(x.displayDate.day).padStart(2, "0")}`,
    max: x.maxTemperature?.degrees, min: x.minTemperature?.degrees, code: 0,
    label: x.daytimeForecast?.weatherCondition?.description?.text || "—", precip: x.daytimeForecast?.precipitation?.probability?.percent ?? 0,
  }));
  return { current: { temp: c.temperature?.degrees, label: c.weatherCondition?.description?.text || "—", wind: c.wind?.speed?.value ?? 0, humidity: c.relativeHumidity ?? 0 }, days, provider: "Google Weather" };
}

export async function getWeather(q: { place?: string; lat?: number; lng?: number }): Promise<WeatherReport> {
  let place = q.place || "Your location", country: string | undefined, lat = q.lat!, lng = q.lng!;
  if (q.place && (lat == null || lng == null)) { const g = await geocode(q.place); place = g.name; country = g.country; lat = g.lat; lng = g.lng; }
  let data: any;
  const key = process.env.GOOGLE_WEATHER_API_KEY || "";
  if (key) { try { data = await googleWeather(lat, lng, key); } catch { data = null; } }
  if (!data) data = await openMeteo(lat, lng);
  return { place, country, lat, lng, ...data, alerts: advisories(data.days, data.current.wind), fetchedAt: new Date().toISOString() };
}

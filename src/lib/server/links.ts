// Booking handoff links — whitelisted providers only. These open provider search pages;
// they never create a reservation on the user's behalf.
const e = encodeURIComponent;

export function stayLinks(p: { dest: string; checkin?: string; checkout?: string; adults?: number; children?: number; rooms?: number; entireHome?: boolean; work?: boolean }) {
  const q = new URLSearchParams({ ss: p.dest, group_adults: String(p.adults ?? 2), group_children: String(p.children ?? 0), no_rooms: String(p.rooms ?? 1) });
  if (p.checkin) q.set("checkin", p.checkin);
  if (p.checkout) q.set("checkout", p.checkout);
  if (p.entireHome) q.set("nflt", "privacy_type=3");
  if (p.work) q.set("sb_travel_purpose", "business");
  return {
    booking: `https://www.booking.com/searchresults.html?${q.toString()}`,
    agoda: `https://www.agoda.com/search?textToSearch=${e(p.dest)}${p.checkin ? `&checkIn=${p.checkin}` : ""}${p.checkout ? `&checkOut=${p.checkout}` : ""}&rooms=${p.rooms ?? 1}&adults=${p.adults ?? 2}`,
    tripadvisor: `https://www.tripadvisor.com/Search?q=${e(p.dest + " hotels")}`,
  };
}

export const FLIGHT_FARE = "https://www.flight-fare.com/compare/?campaignid=488092294&adgroupid=1239151164640093&rtm=2cba7078a3e416c8a87d1ace99fd69b8&b=4&msclkid=2cba7078a3e416c8a87d1ace99fd69b8";
export const AIR_ZIM = "https://www.airzimbabwe.aero/";

export function flightLinks(p: { from: string; to: string; depart?: string; ret?: string; adults?: number; cabin?: string }) {
  const code = (s: string) => (s.match(/\(([A-Z]{3})\)/)?.[1] || s.trim().slice(0, 3)).toUpperCase();
  const zim = /zimbabwe|harare|bulawayo|victoria falls|\bHRE\b|\bBUQ\b|\bVFA\b/i.test(p.from + " " + p.to);
  const bk = `https://flights.booking.com/flights/${code(p.from)}-${code(p.to)}/?type=${p.ret ? "ROUNDTRIP" : "ONEWAY"}&adults=${p.adults ?? 1}&cabinClass=${(p.cabin || "ECONOMY").toUpperCase()}${p.depart ? `&depart=${p.depart}` : ""}${p.ret ? `&return=${p.ret}` : ""}`;
  return { booking: bk, flightFare: FLIGHT_FARE, agoda: "https://www.agoda.com/flights", airZimbabwe: zim ? AIR_ZIM : undefined, tripadvisor: `https://www.tripadvisor.com/CheapFlightsHome` };
}

export function carLinks(p: { where: string }) {
  return { booking: `https://www.booking.com/cars/index.html?ss=${e(p.where)}`, tripadvisor: `https://www.tripadvisor.com/Search?q=${e(p.where + " car rental")}` };
}
export function attractionLinks(p: { where: string }) {
  return { booking: `https://www.booking.com/attractions/searchresults.html?query=${e(p.where)}`, tripadvisor: `https://www.tripadvisor.com/Search?q=${e(p.where + " attractions")}` };
}
export function taxiLinks() {
  return { booking: "https://www.booking.com/taxi/index.html" };
}

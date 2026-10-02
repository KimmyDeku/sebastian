// Replace these with Sebastian's real support details.
export const SUPPORT = {
  whatsapp: "263 71 184 9831", // country code + number, digits only (no + or spaces)
  phone: "+263 77 170 3374",
  email: "kimberlyrmunyoro@gmail.com",
  hours: "Monday to Friday, 08:00 to 17:00 (CAT)",
  company: "Sebastian AI",
  address: "17 Oxford Ave Newlands, Harare, Zimbabwe",
};

export const whatsappLink = (text = "") => `https://wa.me/${SUPPORT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

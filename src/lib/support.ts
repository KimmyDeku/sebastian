// Replace these with Sebastian's real support details.
export const SUPPORT = {
  whatsapp: "263770000000", // country code + number, digits only (no + or spaces)
  phone: "+263 77 000 0000",
  email: "support@example.com",
  hours: "Monday to Friday, 08:00 to 17:00 (CAT)",
  company: "[Company name]",
  address: "[Registered address], Harare, Zimbabwe",
};

export const whatsappLink = (text = "") => `https://wa.me/${SUPPORT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

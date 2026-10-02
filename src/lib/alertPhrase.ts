// The words Sebastian uses for every reminder alert. Never includes what the reminder is about.
export function alertPhrase(acc: { gender?: string; firstName?: string } | null | undefined, useTitle = true) {
  const who = useTitle ? (acc?.gender === "male" ? "Master" : "M'lady") : acc?.firstName || "";
  return `Pardon me${who ? `, ${who}` : ""}, you have a notification that requires your attention.`;
}

export const runtime = "nodejs";
// Paynow posts status updates here. Sebastian confirms payments by checking with Paynow directly,
// so this only needs to acknowledge the message.
export async function POST() { return new Response("OK"); }

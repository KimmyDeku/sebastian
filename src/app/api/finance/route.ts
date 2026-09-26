import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { summary, period } = await req.json();
    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\nRole: financial organiser and accountant with 50+ years' experience. This is budgeting guidance on user-recorded figures, not regulated financial advice. Never promise returns.`,
      `Review this ${period} summary of user-recorded income and expenses: ${JSON.stringify(summary)}.
Return {"headline":"one sentence","observations":[3 short],"savingsPlan":[{"step","amount":number}],"cutBack":[{"category","suggestion"}]}`, 1500);
    return Response.json({ ok: true, review: r });
  } catch (e) { return errorResponse(e); }
}

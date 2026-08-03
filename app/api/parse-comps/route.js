// Turns pasted MLS text (search results, CSV exports, printouts) into
// structured comps. Login required, same as generation.

import { requirePaidUser } from "../../lib/access";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const gate = await requirePaidUser(request);
    if (gate.error) return Response.json({ error: gate.error }, { status: gate.status });

    const { pasted } = await request.json();
    if (!pasted || pasted.trim().length < 20) {
      return Response.json({ error: "Paste your MLS results first." }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY in Vercel." }, { status: 500 });
    }

    const prompt = `You are a data extraction tool for a real estate CMA app. The user pasted raw text copied from an MLS system, a CSV export, a Zillow/Redfin page, or a printout. Extract the SOLD comparable properties from it.

For each property extract:
- address (street address only, no city/state/zip)
- sold: month and year sold, formatted like "May 2026" (if only a date like 05/12/2026, convert it; if unknown, use "Recent")
- beds (number), baths (number), sqft (number, no commas)
- price: the SOLD/closed price as a plain number, no symbols (prefer sold price over list price if both appear)
- status: "Sold", "Pending" or "Active" if stated, otherwise "Sold"
- dom: days on market as a number if stated, otherwise ""
- lotSize: lot size as stated (e.g. "6,600 sqft" or "0.25 acres"), otherwise ""
- year: year built as a number if stated, otherwise ""
- remarks: the listing/agent remarks or property description paragraph if one appears for that property, otherwise "" (copy it as-is, do not rewrite)

If the text also clearly contains ONE subject property (an active/target property being analyzed rather than sold comps), extract it the same way into "subject" with an extra "city" field if present; otherwise set "subject" to null.

Rules: Only include properties that are clearly sold comps. Skip actives/pendings unless nothing else exists. If a value is genuinely missing use reasonable nulls: beds/baths/sqft 0, but NEVER invent prices — skip a property with no price. Maximum 8 comps.

Respond ONLY with valid JSON, no markdown fences, no commentary:
{"comps":[{"address":"...","sold":"...","beds":0,"baths":0,"sqft":0,"price":0,"status":"Sold","dom":"","lotSize":"","year":"","remarks":""}], "subject": null}

Here is the pasted text:
"""
${pasted.slice(0, 12000)}
"""`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return Response.json({ error: "The AI service returned an error." }, { status: 502 });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!parsed.comps || !Array.isArray(parsed.comps) || parsed.comps.length === 0) {
      return Response.json(
        { error: "Couldn't find any sold comps in that text. Try pasting more of the page." },
        { status: 422 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("parse-comps route error:", err);
    return Response.json({ error: "Import failed. Try pasting again." }, { status: 500 });
  }
}

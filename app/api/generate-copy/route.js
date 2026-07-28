// Server-side route: the ANTHROPIC_API_KEY never reaches the browser.
// Runs on the Node runtime (not Edge) for maximum compatibility.

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { subject, highlights, tone, listPrice } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "Missing ANTHROPIC_API_KEY environment variable in Vercel." },
        { status: 500 }
      );
    }

    const prompt = `You are writing listing marketing copy for a real estate agent. Property details:
Address: ${subject.address}, ${subject.city}
${subject.beds} bed / ${subject.baths} bath, ${subject.sqft} sqft, ${subject.lot} lot, built ${subject.year}
Recommended list price: ${listPrice}
Agent-provided highlights: ${highlights}
Tone: ${tone}

Write three pieces:
1. An MLS description, 700-900 characters, no emojis, no exclamation overload, fair-housing compliant (describe the property, never the ideal buyer or neighborhood demographics).
2. An Instagram caption announcing the listing, 2-4 short lines plus 5-8 relevant hashtags, emojis welcome.
3. An email blast to the agent's contact list: a subject line under 60 characters and a body of 80-130 words ending with a call to action to schedule a showing.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{"mls": "...", "instagram": "...", "emailSubject": "...", "emailBody": "..."}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return Response.json(
        { error: "The AI service returned an error. Check your API key and billing." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return Response.json(parsed);
  } catch (err) {
    console.error("generate-copy route error:", err);
    return Response.json(
      { error: "Generation failed. Try again in a moment." },
      { status: 500 }
    );
  }
}

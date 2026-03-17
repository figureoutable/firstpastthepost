import { NextResponse } from "next/server";
import sicData from "@/lib/sic-codes-data.json";

type SicRow = { code: string; description: string };

const SIC_LIST = sicData as SicRow[];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description = String(body.description || "").trim();
    if (!description || description.length < 10) {
      return NextResponse.json(
        { error: "Please enter at least a short description of your business (10+ characters)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const sicExcerpt = SIC_LIST.map((r) => `${r.code} - ${r.description}`).join("\n");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are a UK company formation assistant. Your job is to pick the most appropriate UK SIC 2007 codes for a business.\n\nYou are given:\n1) A condensed list of valid UK SIC 2007 codes in the format 'CODE - description'.\n2) A plain English description of the business.\n\nRules:\n- Only return codes that appear in the provided list.\n- Prefer specific, well-targeted codes over generic consultancy ones.\n- If the description clearly mentions a sector (e.g. cafe, construction, hairdressing, marketing agency), choose codes that mention that sector rather than generic 'business support' or 'management consultancy'.\n- Return between 3 and 6 codes.\n- Output ONLY a valid JSON array, nothing else.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    `Here is the condensed UK SIC 2007 list (code - description):\n\n` +
                    sicExcerpt.slice(0, 100000) +
                    `\n\n---\nBusiness description: "${description}".\n\nReturn ONLY a JSON array of 3-6 objects in this exact shape:\n[\n  { "code": "73110", "description": "Advertising agencies" },\n  { "code": "73120", "description": "Media representation" }\n]\nCodes must come from the list above.`,
                },
              ],
            },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = data.choices?.[0]?.message?.content || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { code: string; description: string }[];
          const valid = parsed
            .filter((p) => SIC_LIST.some((s) => s.code === p.code))
            .slice(0, 4);
          if (valid.length) return NextResponse.json({ suggestions: valid });
        }
      }
    }

    // Fallback: keyword match on embedded list
    const words = description.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const scored = SIC_LIST.map((row) => {
      const d = row.description.toLowerCase();
      let score = 0;
      for (const w of words) if (d.includes(w)) score += 2;
      if (d.includes("software") && description.toLowerCase().includes("software")) score += 5;
      if (d.includes("consult") && description.toLowerCase().includes("consult")) score += 5;
      return { ...row, score };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const fallback =
      scored.length >= 3
        ? scored
        : [
            { code: "62020", description: "Information technology consultancy activities" },
            { code: "70229", description: "Management consultancy activities other than financial management" },
            { code: "82990", description: "Other business support service activities n.e.c." },
            { code: "99999", description: "Dormant Company" },
          ].map((r) => ({ code: r.code, description: r.description }));
    return NextResponse.json({ suggestions: fallback.slice(0, 4) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to suggest codes" },
      { status: 500 }
    );
  }
}

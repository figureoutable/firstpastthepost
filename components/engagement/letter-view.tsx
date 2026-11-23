import type { LetterBlock } from "@/lib/engagements/types";

/** Renders the saved letter blocks. The same blocks make the PDF, so what the client reads is what they sign. */
export function LetterView({ blocks }: { blocks: LetterBlock[] }) {
  return (
    <article className="text-[15px] leading-relaxed text-stone-800">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h1":
            return <h2 key={i} className="text-2xl font-semibold tracking-tight text-stone-900">{block.text}</h2>;
          case "h2":
            return <h3 key={i} className="mb-2 mt-7 text-base font-semibold text-stone-900">{block.text}</h3>;
          case "small":
            return <p key={i} className="mb-6 mt-1 text-sm text-stone-500">{block.text}</p>;
          case "p":
            return <p key={i} className="mb-3">{block.text}</p>;
          case "list":
            return (
              <ul key={i} className="mb-3 list-disc space-y-1 pl-5">
                {block.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            );
          case "fees":
            return (
              <div key={i} className="mb-3 overflow-hidden rounded-xl border border-stone-200">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Service</th>
                      <th className="px-3 py-2 text-left font-medium">Billed</th>
                      <th className="px-3 py-2 text-right font-medium">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {block.rows.map((r) => (
                      <tr key={r.name}>
                        <td className="px-3 py-2.5 text-stone-900">{r.name}</td>
                        <td className="px-3 py-2.5 text-stone-600">{r.billing}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-stone-900">{r.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-stone-200 bg-stone-50/60 px-3 py-2.5 text-sm font-semibold text-stone-900">
                  Total: {block.totals.join(", ") || "Free"}
                </p>
              </div>
            );
        }
      })}
    </article>
  );
}

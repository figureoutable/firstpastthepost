"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Address } from "./state";
import { emptyAddress } from "./state";

function upperPostcode(pc: string) {
  return pc.trim().toUpperCase();
}

export function PostcodeInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      onBlur={(e) => {
        props.onBlur?.(e);
        const v = upperPostcode(e.target.value);
        if (v !== e.target.value && props.onChange)
          (props.onChange as React.ChangeEventHandler<HTMLInputElement>)({
            ...e,
            target: { ...e.target, value: v },
          } as React.ChangeEvent<HTMLInputElement>);
      }}
    />
  );
}

export function AddressFields({
  value,
  onChange,
  errors,
  prefix,
}: {
  value: Address;
  onChange: (a: Address) => void;
  errors?: Partial<Record<keyof Address | string, string>>;
  prefix?: string;
}) {
  const p = (k: string) => (prefix ? `${prefix}.${k}` : k);
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1">
        <Label>Address line 1 *</Label>
        <Input value={value.line1} onChange={(e) => set("line1", e.target.value)} />
        {errors?.[p("line1")] && <p className="text-xs text-red-600">{errors[p("line1")]}</p>}
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label>Address line 2</Label>
        <Input value={value.line2} onChange={(e) => set("line2", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Town *</Label>
        <Input value={value.town} onChange={(e) => set("town", e.target.value)} />
        {errors?.[p("town")] && <p className="text-xs text-red-600">{errors[p("town")]}</p>}
      </div>
      <div className="space-y-1">
        <Label>County</Label>
        <Input value={value.county} onChange={(e) => set("county", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Postcode *</Label>
        <PostcodeInput
          value={value.postcode}
          onChange={(e) => set("postcode", e.target.value)}
          onBlur={(e) => set("postcode", upperPostcode(e.target.value))}
        />
        {errors?.[p("postcode")] && <p className="text-xs text-red-600">{errors[p("postcode")]}</p>}
      </div>
      <div className="space-y-1">
        <Label>Country *</Label>
        <Input value={value.country} onChange={(e) => set("country", e.target.value)} />
      </div>
    </div>
  );
}

export function PostcodeLookupBlock({
  value,
  onChange,
  errors,
  id,
}: {
  value: Address;
  onChange: (a: Address) => void;
  errors?: Partial<Record<string, string>>;
  id: string;
}) {
  const [pc, setPc] = useState("");
  const [list, setList] = useState<{ address: string }[]>([]);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);

  const find = async () => {
    const code = upperPostcode(pc).replace(/\s/g, "");
    if (!code) return;
    setLoading(true);
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(code)}`);
      const j = await r.json();
      if (j.status === 200 && j.result) {
        const a = j.result;
        onChange({
          line1: [a.building_name, a.thoroughfare].filter(Boolean).join(", ") || a.line_1 || "",
          line2: a.dependent_locality || a.line_2 || "",
          town: a.post_town || "",
          county: a.admin_county || a.county || "",
          postcode: a.postcode || code,
          country: "United Kingdom",
        });
        setList([]);
        setManual(true);
      } else {
        const auto = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(code)}/autocomplete`
        );
        const aj = await auto.json();
        if (aj.result?.length) {
          setList(aj.result.slice(0, 10).map((x: string) => ({ address: x })));
        } else setManual(true);
      }
    } catch {
      setManual(true);
    }
    setLoading(false);
  };

  const pick = async (addr: string) => {
    setLoading(true);
    try {
      const r = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(addr.split(",")[0].trim())}`
      );
      const j = await r.json();
      if (j.result) {
        const a = j.result;
        onChange({
          line1: addr.split(",")[0] || a.line_1,
          line2: "",
          town: a.post_town,
          county: a.admin_county || "",
          postcode: a.postcode,
          country: "United Kingdom",
        });
      }
    } catch {
      onChange({ ...emptyAddress(), postcode: upperPostcode(pc) });
    }
    setLoading(false);
    setManual(true);
    setList([]);
  };

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/50 p-4">
      {!manual && (
        <>
          <div className="flex flex-wrap gap-2">
            <PostcodeInput
              placeholder="Postcode"
              value={pc}
              onChange={(e) => setPc(e.target.value)}
              className="max-w-[140px]"
            />
            <Button type="button" variant="outline" onClick={find} disabled={loading}>
              {loading ? "…" : "Find address"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setManual(true)}>
              Enter manually
            </Button>
          </div>
          {list.length > 0 && (
            <ul className="max-h-40 overflow-auto text-sm">
              {list.map((x) => (
                <li key={x.address}>
                  <button
                    type="button"
                    className="text-left text-forest-700 underline"
                    onClick={() => pick(x.address)}
                  >
                    {x.address}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {manual && (
        <>
          <AddressFields value={value} onChange={onChange} errors={errors} prefix={id} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setManual(false)}>
            Back to postcode search
          </Button>
        </>
      )}
    </div>
  );
}

import { putJson, readJson } from "@/lib/private-blob";

/** Team switches in Settings. */
export interface TeamSettings {
  /** Start the Firmcheck AML check automatically when a link client submits their details (live site only). */
  autoStartAml: boolean;
  /** Send one daily summary instead of "letter signed" and "payment set up" emails. Problems always email straight away. */
  dailySummary: boolean;
  /** Lets people start the old public form at /onboard without a link. On until the team turns it off. */
  oldOnboardingForm: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const PATH = "settings/options.json";
const DEFAULTS: TeamSettings = { autoStartAml: false, dailySummary: false, oldOnboardingForm: true };

export async function getSettings(): Promise<TeamSettings> {
  const saved = await readJson<Partial<TeamSettings>>(PATH);
  return { ...DEFAULTS, ...(saved || {}) };
}

export async function saveSettings(input: Partial<TeamSettings>, by: string): Promise<TeamSettings> {
  const current = await getSettings();
  const next: TeamSettings = {
    autoStartAml: typeof input.autoStartAml === "boolean" ? input.autoStartAml : current.autoStartAml,
    dailySummary: typeof input.dailySummary === "boolean" ? input.dailySummary : current.dailySummary,
    oldOnboardingForm: typeof input.oldOnboardingForm === "boolean" ? input.oldOnboardingForm : current.oldOnboardingForm,
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  };
  await putJson(PATH, next);
  return next;
}

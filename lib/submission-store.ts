import crypto from "crypto";
import { listFiles, putJson, readJson } from "@/lib/private-blob";

export type SubmissionStatus = "pending_review" | "initiated" | "completed" | "failed";

/** What was submitted: client onboarding, or a new company formation. */
export type SubmissionKind = "onboarding" | "incorporation";

/** A person to run an individual AML check on (used for company formations). */
export interface AmlPerson {
    fullName: string;
    email?: string;
    dob?: string;
    address?: string;
}

export interface SubmissionRecord {
    id: string;
    kind?: SubmissionKind;
    createdAt: string;
    updatedAt: string;
    status: SubmissionStatus;
    payload: Record<string, unknown>;
    amlPeople?: AmlPerson[];
    firmcheck?: {
        clientIds: string[];
        verificationIds: string[];
        lastPolledAt?: string;
        amlStatus?: string;
        riskLevel?: string;
    };
    notifications?: {
        initiatedEmailSent?: boolean;
        completionEmailSent?: boolean;
        failureEmailSent?: boolean;
    };
    error?: string;
}

const PREFIX = "submissions/";

function pathnameFor(id: string): string {
    return `${PREFIX}${id}.json`;
}

function isValidId(id: string): boolean {
    return /^[0-9a-f-]{36}$/i.test(id);
}

export async function saveSubmission(record: SubmissionRecord): Promise<void> {
    await putJson(pathnameFor(record.id), record);
}

export async function createSubmission(
    payload: Record<string, unknown>,
    options: { kind?: SubmissionKind; amlPeople?: AmlPerson[] } = {}
): Promise<SubmissionRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: SubmissionRecord = {
        id,
        kind: options.kind ?? "onboarding",
        createdAt: now,
        updatedAt: now,
        status: "pending_review",
        payload,
        amlPeople: options.amlPeople,
        firmcheck: {
            clientIds: [],
            verificationIds: [],
        },
        notifications: {},
    };
    await saveSubmission(record);
    return record;
}

export async function getSubmission(id: string): Promise<SubmissionRecord | null> {
    if (!isValidId(id)) return null;
    return readJson<SubmissionRecord>(pathnameFor(id));
}

export async function listSubmissions(): Promise<SubmissionRecord[]> {
    const files = await listFiles(PREFIX);
    const records = await Promise.all(
        files.map((file) => readJson<SubmissionRecord>(file.pathname))
    );
    return records.filter((r): r is SubmissionRecord => Boolean(r));
}

import { list, put } from "@vercel/blob";
import crypto from "crypto";

export type SubmissionStatus = "pending_review" | "initiated" | "completed" | "failed";

export interface SubmissionRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: SubmissionStatus;
    payload: Record<string, unknown>;
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

function pathnameFor(id: string): string {
    return `submissions/${id}.json`;
}

function parseJson(text: string): SubmissionRecord {
    return JSON.parse(text) as SubmissionRecord;
}

export async function saveSubmission(record: SubmissionRecord): Promise<void> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");

    await put(pathnameFor(record.id), JSON.stringify(record, null, 2), {
        access: "public",
        allowOverwrite: true,
        token,
    });
}

export async function createSubmission(payload: Record<string, unknown>): Promise<SubmissionRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: SubmissionRecord = {
        id,
        createdAt: now,
        updatedAt: now,
        status: "pending_review",
        payload,
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
    const { blobs } = await list({ prefix: pathnameFor(id) });
    if (!blobs.length) return null;
    const blob = blobs[0];
    const res = await fetch(blob.url);
    if (!res.ok) return null;
    return parseJson(await res.text());
}

export async function listSubmissions(): Promise<SubmissionRecord[]> {
    const { blobs } = await list({ prefix: "submissions/" });
    if (!blobs.length) return [];

    const records = await Promise.all(
        blobs.map(async (blob) => {
            const res = await fetch(blob.url);
            if (!res.ok) return null;
            try {
                return parseJson(await res.text());
            } catch {
                return null;
            }
        })
    );

    return records.filter((r): r is SubmissionRecord => Boolean(r));
}

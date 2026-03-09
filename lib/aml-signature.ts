import crypto from "crypto";

function getSigningSecret(): string {
    const secret = process.env.AML_INITIATE_SECRET;
    if (!secret) {
        throw new Error("AML_INITIATE_SECRET is not configured");
    }
    return secret;
}

export function signSubmissionId(submissionId: string): string {
    const hmac = crypto.createHmac("sha256", getSigningSecret());
    hmac.update(submissionId);
    return hmac.digest("hex");
}

export function verifySubmissionSignature(submissionId: string, signature: string): boolean {
    const expected = signSubmissionId(submissionId);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== signatureBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

const FIRMCHECK_BASE_URL = "https://api.firmcheck.com";

type JsonObject = Record<string, unknown>;

function getApiKey(): string {
    const key = process.env.FIRMCHECK_API_KEY;
    if (!key) throw new Error("FIRMCHECK_API_KEY is not configured");
    return key;
}

async function requestWithHeaders(
    path: string,
    method: string,
    body?: JsonObject,
    useBearer = true
): Promise<Response> {
    const key = getApiKey();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (useBearer) {
        headers.Authorization = `Bearer ${key}`;
    } else {
        headers["x-api-key"] = key;
    }

    return fetch(`${FIRMCHECK_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
}

async function firmcheckRequest(path: string, method: string, body?: JsonObject): Promise<JsonObject> {
    let res = await requestWithHeaders(path, method, body, true);
    if (res.status === 401 || res.status === 403) {
        res = await requestWithHeaders(path, method, body, false);
    }

    let parsed: JsonObject = {};
    try {
        parsed = (await res.json()) as JsonObject;
    } catch {
        // ignore
    }

    if (!res.ok) {
        throw new Error(`Firmcheck ${method} ${path} failed (${res.status}): ${JSON.stringify(parsed)}`);
    }
    return parsed;
}

function readId(payload: JsonObject): string {
    const candidates = ["id", "client_id", "clientId", "verification_id", "verificationId"];
    for (const key of candidates) {
        const value = payload[key];
        if (typeof value === "string" && value) return value;
    }
    throw new Error(`Could not find id in Firmcheck response: ${JSON.stringify(payload)}`);
}

export async function createCompanyClient(crn: string, companyName?: string): Promise<{ clientId: string; raw: JsonObject }> {
    const response = await firmcheckRequest("/clients", "POST", {
        type: "company",
        company_registration_number: crn,
        company_name: companyName,
    });
    return { clientId: readId(response), raw: response };
}

export async function createIndividualClient(input: {
    fullName: string;
    email?: string;
    dob?: string;
    residentialAddress?: string;
}): Promise<{ clientId: string; raw: JsonObject }> {
    const response = await firmcheckRequest("/clients", "POST", {
        type: "individual",
        full_legal_name: input.fullName,
        email: input.email,
        date_of_birth: input.dob,
        residential_address: input.residentialAddress,
    });
    return { clientId: readId(response), raw: response };
}

export async function triggerVerification(clientId: string): Promise<{ verificationId: string; raw: JsonObject }> {
    const response = await firmcheckRequest("/verifications", "POST", {
        client_id: clientId,
        flow: "advanced_id_cryptographic",
    });
    return { verificationId: readId(response), raw: response };
}

export async function getClient(clientId: string): Promise<JsonObject> {
    return firmcheckRequest(`/clients/${clientId}`, "GET");
}

export function extractAmlStatus(payload: JsonObject): { amlStatus?: string; riskLevel?: string } {
    const amlStatusCandidate =
        payload.aml_status ??
        payload.amlStatus ??
        (typeof payload.status === "string" ? payload.status : undefined);

    const riskCandidate =
        payload.risk_level ??
        payload.riskLevel ??
        payload.risk ??
        payload.aml_risk_level;

    return {
        amlStatus: typeof amlStatusCandidate === "string" ? amlStatusCandidate : undefined,
        riskLevel: typeof riskCandidate === "string" ? riskCandidate : undefined,
    };
}

const FIRMCHECK_BASE_URL = "https://api.firmcheck.com";

type JsonObject = Record<string, unknown>;

function getApiKey(): string {
    const key = process.env.FIRMCHECK_API_KEY;
    if (!key) throw new Error("FIRMCHECK_API_KEY is not configured");
    return key;
}

async function firmcheckRequest(path: string, method: string, body?: JsonObject): Promise<JsonObject> {
    const key = getApiKey();
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${key}`,
        "accept-version": "1.0.0",
    };

    if (body) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${FIRMCHECK_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let parsed: JsonObject = {};
    try {
        parsed = (await res.json()) as JsonObject;
    } catch {
        // ignore
    }

    if (!res.ok) {
        throw new Error(`Firmcheck ${method} ${path} failed (${res.status}): ${JSON.stringify(parsed)}`);
    }

    if (parsed.data && typeof parsed.data === "object") {
        return parsed.data as JsonObject;
    }
    return parsed;
}

export async function createCompanyClient(crn: string): Promise<{ clientId: string; raw: JsonObject }> {
    const response = await firmcheckRequest("/clients", "POST", {
        status: "PROSPECT",
        entity: {
            object: "import_uk_company",
            companyNumber: crn,
        },
    });
    const clientId = typeof response.id === "string" ? response.id : "";
    if (!clientId) throw new Error(`No client id in Firmcheck response: ${JSON.stringify(response)}`);
    return { clientId, raw: response };
}

export async function createIndividualClient(input: {
    fullName: string;
    email?: string;
    dob?: string;
    residentialAddress?: string;
}): Promise<{ clientId: string; raw: JsonObject }> {
    const nameParts = input.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const entity: JsonObject = {
        object: "individual",
        firstName,
        lastName,
    };
    if (input.email) entity.email = input.email;
    if (input.dob) entity.dateOfBirth = input.dob;
    if (input.residentialAddress) entity.residentialAddress = input.residentialAddress;

    const response = await firmcheckRequest("/clients", "POST", {
        status: "PROSPECT",
        entity,
    });
    const clientId = typeof response.id === "string" ? response.id : "";
    if (!clientId) throw new Error(`No client id in Firmcheck response: ${JSON.stringify(response)}`);
    return { clientId, raw: response };
}

export async function getClient(clientId: string): Promise<JsonObject> {
    return firmcheckRequest(`/clients/${clientId}`, "GET");
}

export function extractAmlStatus(payload: JsonObject): { amlStatus?: string; riskLevel?: string } {
    const amlStatusCandidate =
        payload.amlDeterminationStatus ??
        payload.aml_status ??
        payload.amlStatus;

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

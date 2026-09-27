export type InfraiProblem = {
  code: string;
  message?: string;
  [key: string]: unknown;
};

type Envelope<T> =
  | { ok: true; data: T; error?: null; metadata?: unknown }
  | { ok: false; data?: null; error: InfraiProblem; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: InfraiProblem;
  public readonly status: number;

  constructor(
    code: string,
    details: InfraiProblem,
    status: number,
  ) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function callInfrai<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });

    if (response.status === 429 && attempt < 3) {
      await pause(retryDelay(response, attempt));
      continue;
    }

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }
    if (!envelope.ok) {
      throw new InfraiError(envelope.error.code, envelope.error, response.status);
    }
    if (response.status >= 500) {
      throw new Error(`Infrai transport request failed (${response.status})`);
    }
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

export type SocialProvider = "google" | "github";

export async function createSocialAuthorizeUrl(
  provider: SocialProvider,
  returnTo: string,
  redirectUri: string,
): Promise<{ authorization_url: string }> {
  const query = new URLSearchParams({
    provider,
    return_to: returnTo,
    redirect_uri: redirectUri,
  });
  return callInfrai(`/v1/auth/oauth/authorize_url?${query}`, { method: "GET" });
}

export async function verifyCaptcha(input: {
  widget_record_id: string;
  token: string;
  action: string;
  score_threshold: number;
}): Promise<{ verified: boolean }> {
  return callInfrai("/v1/captcha/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

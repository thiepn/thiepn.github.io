const CACHE_TTL_MS = 30_000;
const CHECK_TIMEOUT_MS = 4_000;

type Check = {
  status: "healthy" | "degraded" | "outage";
  latencyMs: number;
  httpStatus: number;
};

type HealthPayload = {
  service: "thiepn-account-platform";
  status: "healthy" | "degraded" | "outage";
  checkedAt: string;
  requestId: string;
  checks: {
    auth: Check;
    database: Check;
  };
};

let cached: { expiresAt: number; value: Omit<HealthPayload, "requestId"> } | null = null;

function jsonHeaders(requestId: string) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-request-id",
    "X-Request-ID": requestId,
    "Vary": "Origin",
  };
}

function classify(httpStatus: number): Check["status"] {
  if (httpStatus >= 200 && httpStatus < 300) return "healthy";
  if (httpStatus === 408 || httpStatus === 425 || httpStatus === 429 || httpStatus >= 500) {
    return "degraded";
  }
  return "outage";
}

async function check(url: string, headers: Record<string, string>): Promise<Check> {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    return {
      status: classify(response.status),
      latencyMs: Math.round(performance.now() - started),
      httpStatus: response.status,
    };
  } catch {
    return {
      status: "outage",
      latencyMs: Math.round(performance.now() - started),
      httpStatus: 0,
    };
  }
}

function overall(checks: HealthPayload["checks"]): HealthPayload["status"] {
  const states = Object.values(checks).map((item) => item.status);
  if (states.includes("outage")) return "outage";
  if (states.includes("degraded")) return "degraded";
  return "healthy";
}

async function evaluate(): Promise<Omit<HealthPayload, "requestId">> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    const unavailable: Omit<HealthPayload, "requestId"> = {
      service: "thiepn-account-platform",
      status: "outage",
      checkedAt: new Date().toISOString(),
      checks: {
        auth: { status: "outage", latencyMs: 0, httpStatus: 0 },
        database: { status: "outage", latencyMs: 0, httpStatus: 0 },
      },
    };
    return unavailable;
  }

  const [auth, database] = await Promise.all([
    check(`${supabaseUrl}/auth/v1/health`, { apikey: serviceRoleKey }),
    check(`${supabaseUrl}/rest/v1/account_apps?select=slug&limit=1`, {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    }),
  ]);

  const checks = { auth, database };
  const value: Omit<HealthPayload, "requestId"> = {
    service: "thiepn-account-platform",
    status: overall(checks),
    checkedAt: new Date().toISOString(),
    checks,
  };
  cached = { expiresAt: now + CACHE_TTL_MS, value };
  return value;
}

Deno.serve(async (request) => {
  const requestId = request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  const headers = jsonHeaders(requestId);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({
      service: "thiepn-account-platform",
      status: "outage",
      requestId,
      error: "METHOD_NOT_ALLOWED",
    }), { status: 405, headers });
  }

  const payload = { ...(await evaluate()), requestId } satisfies HealthPayload;
  const status = payload.status === "outage" ? 503 : 200;
  const log = {
    event: "platform.health",
    request_id: requestId,
    status: payload.status,
    auth_status: payload.checks.auth.status,
    auth_latency_ms: payload.checks.auth.latencyMs,
    database_status: payload.checks.database.status,
    database_latency_ms: payload.checks.database.latencyMs,
  };
  (payload.status === "healthy" ? console.info : console.error)(JSON.stringify(log));

  return new Response(request.method === "HEAD" ? null : JSON.stringify(payload), {
    status,
    headers,
  });
});

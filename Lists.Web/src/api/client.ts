const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5180";

type QueryParamValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryParamValue>;
type HeaderMap = Record<string, string>;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function buildApiUrl(path: string, queryParams: QueryParams = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url;
}

export function buildHeaders(
  accessToken?: string | null,
  headers: HeaderMap = {},
) {
  return {
    ...headers,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function getJsonMessage(body: unknown) {
  if (typeof body !== "object" || body === null || !("message" in body)) {
    return undefined;
  }

  const message = body.message;

  return typeof message === "string" && message.trim()
    ? message
    : undefined;
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return fallbackMessage;
  }

  try {
    const errorBody: unknown = await response.json();

    return getJsonMessage(errorBody) ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function throwIfResponseNotOk(
  response: Response,
  fallbackMessage: string,
) {
  if (response.ok) {
    return;
  }

  const message = await getErrorMessage(response, fallbackMessage);

  throw new ApiError(message, response.status);
}

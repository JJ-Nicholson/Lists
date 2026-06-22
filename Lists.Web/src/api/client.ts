const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5180";

type QueryParamValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryParamValue>;
type HeaderMap = Record<string, string>;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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

type ErrorDetails = {
  code?: string;
  message?: string;
};

function getJsonErrorDetails(body: unknown): ErrorDetails {
  if (typeof body !== "object" || body === null) {
    return {};
  }

  const message = "message" in body ? body.message : undefined;
  const code = "code" in body ? body.code : undefined;

  return {
    code: typeof code === "string" && code.trim() ? code : undefined,
    message:
      typeof message === "string" && message.trim() ? message : undefined,
  };
}

async function getErrorDetails(
  response: Response,
  fallbackMessage: string,
): Promise<ErrorDetails> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { message: fallbackMessage };
  }

  try {
    const errorBody: unknown = await response.json();
    const details = getJsonErrorDetails(errorBody);

    return {
      ...details,
      message: details.message ?? fallbackMessage,
    };
  } catch {
    return { message: fallbackMessage };
  }
}

export async function throwIfResponseNotOk(
  response: Response,
  fallbackMessage: string,
) {
  if (response.ok) {
    return;
  }

  const { code, message } = await getErrorDetails(response, fallbackMessage);

  throw new ApiError(message ?? fallbackMessage, response.status, code);
}

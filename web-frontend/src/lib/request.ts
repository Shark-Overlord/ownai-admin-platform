import type { BaseResponse } from "@/lib/types";
import { getPersistedAuthToken } from "@/lib/auth-session";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api";

const REQUEST_CREDENTIALS: RequestCredentials = "omit";

interface PostJsonOptions {
  includeAuthToken?: boolean;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
}

interface RequestErrorOptions {
  code?: number;
  status?: number;
}

interface TextResponse {
  contentType: string | null;
  responseUrl: string;
  text: string;
}

export interface BlobResponse {
  blob: Blob;
  contentDisposition: string | null;
  contentType: string | null;
  responseUrl: string;
}

export class RequestError extends Error {
  code?: number;
  status?: number;

  constructor(message: string, options?: RequestErrorOptions) {
    super(message);
    this.name = "RequestError";
    this.code = options?.code;
    this.status = options?.status;
  }
}

export function isAuthenticationError(error: unknown) {
  if (error instanceof RequestError) {
    if (error.status === 401) {
      return true;
    }

    if (error.code === 40100 || error.code === 40101 || error.code === 40300) {
      return true;
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();

  return [
    "unauthorized",
    "forbidden",
    "not login",
    "not logged in",
    "login required",
    "sign in first",
    "登录",
    "未登录",
  ].some((keyword) => normalizedMessage.includes(keyword));
}

function buildAuthHeaders(options?: PostJsonOptions) {
  const headers: Record<string, string> = {};
  const authToken =
    options?.includeAuthToken === false ? null : getPersistedAuthToken();

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function buildRequestUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!query) {
    return `${API_BASE_URL}${path}`;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  if (!queryString) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}${path}?${queryString}`;
}

async function parseJsonResponse<T>(response: Response) {
  const text = await response.text();
  let payload: BaseResponse<T> | null = null;

  try {
    payload = text ? (JSON.parse(text) as BaseResponse<T>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new RequestError(payload?.message || "Request failed", {
      code: payload?.code,
      status: response.status,
    });
  }

  if (!payload) {
    throw new RequestError("Empty response from server", {
      status: response.status,
    });
  }

  return payload;
}

export async function getJson<T>(
  path: string,
  options?: PostJsonOptions,
): Promise<BaseResponse<T>> {
  const response = await fetch(buildRequestUrl(path, options?.query), {
    method: "GET",
    credentials: REQUEST_CREDENTIALS,
    headers: buildAuthHeaders(options),
    signal: options?.signal,
  });

  return parseJsonResponse<T>(response);
}

export async function getText(
  path: string,
  options?: PostJsonOptions,
): Promise<TextResponse> {
  const response = await fetch(buildRequestUrl(path, options?.query), {
    method: "GET",
    credentials: REQUEST_CREDENTIALS,
    headers: buildAuthHeaders(options),
    signal: options?.signal,
  });
  const text = await response.text();

  if (!response.ok) {
    let payload: BaseResponse<unknown> | null = null;

    try {
      payload = text ? (JSON.parse(text) as BaseResponse<unknown>) : null;
    } catch {
      payload = null;
    }

    throw new RequestError(payload?.message || "Request failed", {
      code: payload?.code,
      status: response.status,
    });
  }

  return {
    text,
    contentType: response.headers.get("content-type"),
    responseUrl: response.url,
  };
}

async function parseBlobResponse(response: Response): Promise<BlobResponse> {
  const contentType = response.headers.get("content-type");

  if (!response.ok) {
    if (contentType?.toLowerCase().includes("json")) {
      const text = await response.text();
      let payload: BaseResponse<unknown> | null = null;

      try {
        payload = text ? (JSON.parse(text) as BaseResponse<unknown>) : null;
      } catch {
        payload = null;
      }

      throw new RequestError(payload?.message || "Request failed", {
        code: payload?.code,
        status: response.status,
      });
    }

    throw new RequestError("Request failed", {
      status: response.status,
    });
  }

  if (contentType?.toLowerCase().includes("json")) {
    const text = await response.text();
    let payload: BaseResponse<unknown> | null = null;

    try {
      payload = text ? (JSON.parse(text) as BaseResponse<unknown>) : null;
    } catch {
      payload = null;
    }

    throw new RequestError(payload?.message || "Request failed", {
      code: payload?.code,
      status: response.status,
    });
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("content-disposition"),
    contentType,
    responseUrl: response.url,
  };
}

export async function getBlob(
  path: string,
  options?: PostJsonOptions,
): Promise<BlobResponse> {
  const response = await fetch(buildRequestUrl(path, options?.query), {
    method: "GET",
    credentials: REQUEST_CREDENTIALS,
    headers: buildAuthHeaders(options),
    signal: options?.signal,
  });

  return parseBlobResponse(response);
}

/**
 * Fetches an API URL returned by the backend without prepending VITE_API_BASE_URL.
 * This is used for protected one-time download URLs such as "/api/...".
 */
export async function getBlobByUrl(
  url: string,
  options?: Omit<PostJsonOptions, "query">,
): Promise<BlobResponse> {
  const response = await fetch(url, {
    method: "GET",
    credentials: REQUEST_CREDENTIALS,
    headers: buildAuthHeaders(options),
    signal: options?.signal,
  });

  return parseBlobResponse(response);
}

export async function postJson<T>(
  path: string,
  body: unknown,
  options?: PostJsonOptions,
): Promise<BaseResponse<T>> {
  const response = await fetch(buildRequestUrl(path, options?.query), {
    method: "POST",
    credentials: REQUEST_CREDENTIALS,
    headers: {
      ...buildAuthHeaders(options),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  return parseJsonResponse<T>(response);
}

export async function uploadFile<T>(
  path: string,
  file: File,
  options?: PostJsonOptions & { fieldName?: string },
): Promise<BaseResponse<T>> {
  const formData = new FormData();
  formData.append(options?.fieldName || "file", file);

  const response = await fetch(buildRequestUrl(path, options?.query), {
    method: "POST",
    credentials: REQUEST_CREDENTIALS,
    headers: buildAuthHeaders(options),
    body: formData,
    signal: options?.signal,
  });

  return parseJsonResponse<T>(response);
}

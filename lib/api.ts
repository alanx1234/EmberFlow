import {
  AgeRequest,
  AgeResponse,
  ageResponseSchema,
  BatchRequest,
  BatchResponse,
  batchResponseSchema,
  ModelInfo,
  modelInfoSchema,
  RotationRequest,
  RotationResponse,
  rotationResponseSchema,
} from "./schemas";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  parse: (data: unknown) => T,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      "Could not reach the EmberFlow API. If you are running locally, make sure the Python bridge is up (npm run dev).",
    );
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      /* keep status text */
    }
    throw new ApiError(detail, res.status);
  }
  return parse(await res.json());
}

export const getModelInfo = (): Promise<ModelInfo> =>
  request("/api/model", undefined, (d) => modelInfoSchema.parse(d));

export const postAge = (req: AgeRequest): Promise<AgeResponse> =>
  request("/api/age", { method: "POST", body: JSON.stringify(req) }, (d) =>
    ageResponseSchema.parse(d),
  );

export const postAgeBatch = (req: BatchRequest): Promise<BatchResponse> =>
  request(
    "/api/age/batch",
    { method: "POST", body: JSON.stringify(req) },
    (d) => batchResponseSchema.parse(d),
  );

export const postRotation = (req: RotationRequest): Promise<RotationResponse> =>
  request("/api/rotation", { method: "POST", body: JSON.stringify(req) }, (d) =>
    rotationResponseSchema.parse(d),
  );

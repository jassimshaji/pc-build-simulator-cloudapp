// Consistent API response envelope used by every apps/web route handler, so
// clients only ever handle one shape: { data, error } (never both populated).

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiErrorBody {
  message: string;
  issues?: unknown;
}

export interface ApiFailure {
  data: null;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function apiError(message: string, issues?: unknown): ApiFailure {
  return { data: null, error: { message, issues } };
}

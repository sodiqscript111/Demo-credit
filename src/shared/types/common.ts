export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AuthPayload {
  sub: string;
  email: string;
}

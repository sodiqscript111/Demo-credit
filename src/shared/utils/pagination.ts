import type { PaginationParams } from "../types/common";

export const normalizePagination = (params: PaginationParams) => {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

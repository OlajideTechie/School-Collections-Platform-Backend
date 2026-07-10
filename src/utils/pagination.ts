export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePositiveInt(value: unknown, fallback: number): number {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function parsePagination(input: {
  page?: unknown;
  limit?: unknown;
}): PaginationQuery {
  const page = parsePositiveInt(input.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(input.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(
  query: PaginationQuery,
  total: number
): PaginationMeta {
  const totalPages = Math.max(Math.ceil(total / query.limit), 1);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1,
  };
}

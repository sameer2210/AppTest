/**
 * Pagination helper utility
 */
import type { PaginationQuery } from "../types/service.util.js";

export const getPaginationParams = (query: PaginationQuery = {}) => {
  const page = Math.max(1, parseInt(String(query.page ?? ""), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? ""), 10) || 20));
  const skip = (page - 1) * limit;

  const sortBy = typeof query.sortBy === "string" && query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" || query.sortOrder === "1" ? 1 : -1;
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const status = typeof query.status === "string" ? query.status.trim() : "";
  const category = typeof query.category === "string" ? query.category.trim() : "";

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    search,
    status,
    category,
    sort: { [sortBy]: sortOrder },
  };
};

export const buildPaginationMeta = (total = 0, page = 1, limit = 20) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export default {
  getPaginationParams,
  buildPaginationMeta,
};

export function getPagination(query: any) {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query?.limit, 10) || 10));
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

export default getPagination;

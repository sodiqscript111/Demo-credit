const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const convertKeysToCamel = (
  obj: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamelCase(k), v]));

export const postProcessResponse = (result: unknown): unknown => {
  if (Array.isArray(result)) {
    return result.map((row) =>
      row && typeof row === "object" && !Array.isArray(row)
        ? convertKeysToCamel(row as Record<string, unknown>)
        : row,
    );
  }
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return convertKeysToCamel(result as Record<string, unknown>);
  }
  return result;
};

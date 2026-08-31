const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === UNIQUE_VIOLATION;
}

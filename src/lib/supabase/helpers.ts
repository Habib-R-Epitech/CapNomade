/**
 * Supabase response type-cast helpers.
 *
 * The hand-written `Database` types don't include the `Relationships` field,
 * so Supabase fails to infer the result type of queries that use `!inner` join
 * syntax in the select string (it collapses to `never`). These helpers cast
 * the response data to the expected shape declared at the call site.
 *
 * Use them only after you have:
 *  - verified the column list in the select string matches the type,
 *  - confirmed RLS / where-clauses guarantee the expected shape.
 */

export interface SupabaseRowsResp {
  data: unknown;
  error: unknown;
}

export interface SupabaseRowResp {
  data: unknown;
  error: unknown;
}

export function asRow<T>(resp: SupabaseRowResp): T | null {
  return (resp.data ?? null) as T | null;
}

export function asRows<T>(resp: SupabaseRowsResp): T[] {
  const v = resp.data;
  return (Array.isArray(v) ? v : []) as T[];
}

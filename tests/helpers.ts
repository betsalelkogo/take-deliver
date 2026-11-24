import type { Actor } from "../lib/server/actor";

export function actor(key: string | null, legacyPhone = ""): Actor {
  return { key, legacyPhone };
}

export interface FakeSql {
  queries: string[];
  values: unknown[][];
  sql: ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) & {
    transaction: (queries: Promise<unknown[]>[]) => Promise<unknown[][]>;
  };
}

// Stands in for the Neon tagged-template client: records each query and
// answers with the queued results, in order.
export function fakeSql(results: unknown[][]): FakeSql {
  const queue = [...results];
  const queries: string[] = [];
  const values: unknown[][] = [];
  const sql = ((strings: TemplateStringsArray, ...vals: unknown[]) => {
    queries.push(strings.join("?").replace(/\s+/g, " ").trim());
    values.push(vals);
    return Promise.resolve(queue.shift() ?? []);
  }) as FakeSql["sql"];
  sql.transaction = (pending) => Promise.all(pending);
  return { queries, values, sql };
}

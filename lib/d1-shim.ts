// A small adapter that exposes the exact Cloudflare D1 surface this app calls,
// backed by @libsql/client (Turso in production, a local SQLite file in
// development). Every SQL statement in the app stays byte-for-byte unchanged.
//
// The surface actually used by app/api/[...path]/route.ts and lib/server.ts is:
//   db.prepare(sql).bind(...args).first<T>() | .all<T>() | .run()
//   db.batch(statements)
//   result.results / result.meta.changes
// `.raw()` and `first(columnName)` are never called, so they are not provided:
// a missing method is a loud TypeError, not a silently wrong answer.
import type {
  Client,
  InStatement,
  InValue,
  ResultSet,
  Row,
  Value,
} from "@libsql/client";

/** A row as the rest of the app sees it: a plain, JSON-serialisable object. */
export type D1ShimRow = Record<string, Value>;

export interface D1ShimMeta {
  /** D1's `meta.changes`, i.e. libSQL's `rowsAffected`. */
  changes: number;
  /** D1's `meta.last_row_id`, i.e. libSQL's `lastInsertRowid`, as a number. */
  last_row_id: number;
}

export interface D1ShimResult<T = D1ShimRow> {
  results: T[];
  success: true;
  meta: D1ShimMeta;
}

export interface D1ShimPreparedStatement {
  /** The SQL text, so `batch()` can forward the statement to libSQL. */
  readonly sql: string;
  /** The bound arguments, so `batch()` can forward the statement to libSQL. */
  readonly args: readonly InValue[];
  bind(...values: unknown[]): D1ShimPreparedStatement;
  first<T = D1ShimRow>(): Promise<T | null>;
  all<T = D1ShimRow>(): Promise<D1ShimResult<T>>;
  run<T = D1ShimRow>(): Promise<D1ShimResult<T>>;
}

export interface D1ShimDatabase {
  prepare(sql: string): D1ShimPreparedStatement;
  batch<T = D1ShimRow>(
    statements: D1ShimPreparedStatement[],
  ): Promise<D1ShimResult<T>[]>;
}

/**
 * D1 rejects values it cannot store; so do we, instead of coercing `undefined`
 * into NULL and writing something the caller never asked for.
 */
function toInValue(value: unknown): InValue {
  if (value === null) return null;
  switch (typeof value) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
      return value;
    case "object":
      if (
        value instanceof ArrayBuffer ||
        value instanceof Uint8Array ||
        value instanceof Date
      )
        return value;
      break;
    default:
      break;
  }
  throw new TypeError(
    `Unsupported SQL bind value of type ${value === undefined ? "undefined" : typeof value}`,
  );
}

/**
 * libSQL rows are array-like: they carry numeric indices and a `length` next to
 * the named columns. Those extra keys are non-enumerable today, but the app
 * hands rows straight to `Response.json()`, so we copy each row into a real
 * plain object and never depend on the driver's property descriptors.
 */
function toPlainRow<T>(columns: string[], row: Row): T {
  const plain: D1ShimRow = {};
  for (let index = 0; index < columns.length; index += 1)
    plain[columns[index]] = row[index];
  return plain as unknown as T;
}

function toResult<T>(resultSet: ResultSet): D1ShimResult<T> {
  return {
    results: resultSet.rows.map((row) => toPlainRow<T>(resultSet.columns, row)),
    success: true,
    meta: {
      changes: resultSet.rowsAffected,
      last_row_id:
        resultSet.lastInsertRowid === undefined
          ? 0
          : Number(resultSet.lastInsertRowid),
    },
  };
}

function prepared(
  client: Client,
  sql: string,
  args: InValue[],
): D1ShimPreparedStatement {
  const statement: InStatement = { sql, args };
  return {
    sql,
    args,
    bind(...values: unknown[]): D1ShimPreparedStatement {
      return prepared(client, sql, values.map(toInValue));
    },
    async first<T = D1ShimRow>(): Promise<T | null> {
      const resultSet = await client.execute(statement);
      return resultSet.rows.length
        ? toPlainRow<T>(resultSet.columns, resultSet.rows[0])
        : null;
    },
    async all<T = D1ShimRow>(): Promise<D1ShimResult<T>> {
      return toResult<T>(await client.execute(statement));
    },
    async run<T = D1ShimRow>(): Promise<D1ShimResult<T>> {
      return toResult<T>(await client.execute(statement));
    },
  };
}

export function createD1Shim(client: Client): D1ShimDatabase {
  return {
    prepare(sql: string): D1ShimPreparedStatement {
      return prepared(client, sql, []);
    },
    async batch<T = D1ShimRow>(
      statements: D1ShimPreparedStatement[],
    ): Promise<D1ShimResult<T>[]> {
      // "write" mirrors D1's all-or-nothing batch: libSQL wraps the statements
      // in a transaction and rolls the whole batch back if any one of them
      // fails, which is what the order/order_lines insert relies on. Errors are
      // rethrown untouched so the inventory_changed / pending_limit matching in
      // app/api/[...path]/route.ts keeps seeing the raw SQLite abort message.
      const resultSets = await client.batch(
        statements.map((statement) => ({
          sql: statement.sql,
          args: [...statement.args],
        })),
        "write",
      );
      return resultSets.map((resultSet) => toResult<T>(resultSet));
    },
  };
}

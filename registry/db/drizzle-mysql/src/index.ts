import { env } from "{{scope}}/env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const pool = mysql.createPool(env.DATABASE_URL);
export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";

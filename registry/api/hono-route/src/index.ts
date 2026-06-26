import { Hono } from "hono";

export const api = new Hono().get("/health", (c) => c.json({ status: "ok" }));

export type ApiRouter = typeof api;

export type Run = { id: number | null; date: string; miles: number };
type RunInput = { date: string; miles: number };

const ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT ||
  "https://script.google.com/macros/s/AKfycbysfJ6a4tfJOeWAWlIXIu8sWrPuT7Td_0D0rYeR4aXIG5r8CwZIryT63051IlWfU2EZ/exec";

function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

function validateRun(input: RunInput) {
  if (!validDate(input.date) || !Number.isFinite(input.miles) || input.miles <= 0 || input.miles > 500) {
    throw new Error("Pick a valid date and enter miles greater than zero, up to 500.");
  }
}

function validateId(id: number) {
  if (!Number.isInteger(id) || id < 2) throw new Error("Refresh the log before editing this run.");
}

async function mutateSheet(body: Record<string, string | number>): Promise<{ ok: true }> {
  try {
    // text/plain avoids the CORS preflight that Apps Script cannot serve.
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error("Unexpected HTTP status");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("ok" in result) || result.ok !== true) {
      throw new Error("Missing save confirmation");
    }
    return { ok: true };
  } catch {
    // Never retry writes automatically: the server may already have saved them.
    throw new Error("Google Sheets did not confirm the change. Refresh the log to check before trying again.");
  }
}

export const api = {
  async listRuns(_args: Record<string, never>): Promise<{ runs: Run[]; fetchedAt: string }> {
    const response = await fetch(ENDPOINT, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("The running log could not be reached. Try refreshing.");
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("Google Sheets returned an unexpected format.");
    const runs: Run[] = payload.flatMap((row: unknown) => {
      if (!row || typeof row !== "object" || !("date" in row) || !("miles" in row)) return [];
      const date = typeof row.date === "string" ? row.date.slice(0, 10) : "";
      if (!validDate(date) || typeof row.miles !== "number" || !Number.isFinite(row.miles)) return [];
      const id = "id" in row && typeof row.id === "number" && Number.isInteger(row.id) && row.id >= 2 ? row.id : null;
      return [{ id, date, miles: row.miles }];
    });
    runs.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
    return { runs, fetchedAt: new Date().toISOString() };
  },
  addRun(input: RunInput) {
    validateRun(input);
    return mutateSheet({ action: "add", ...input });
  },
  updateRun(input: RunInput & { id: number }) {
    validateRun(input);
    validateId(input.id);
    return mutateSheet({ action: "update", ...input });
  },
  deleteRun(input: { id: number }) {
    validateId(input.id);
    return mutateSheet({ action: "delete", id: input.id });
  },
};


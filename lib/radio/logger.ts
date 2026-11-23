type LogFields = Record<string, string | number | boolean | undefined | null>;

export function radioLog(event: string, fields: LogFields = {}): void {
  const payload = {
    scope: "radio",
    event,
    ts: Date.now(),
    ...fields,
  };
  console.info(JSON.stringify(payload));
}

export function radioWarn(event: string, fields: LogFields = {}): void {
  const payload = {
    scope: "radio",
    level: "warn",
    event,
    ts: Date.now(),
    ...fields,
  };
  console.warn(JSON.stringify(payload));
}

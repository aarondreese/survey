// Helpers to parse JSON string fields returned from the database
export function tryParseJson(value: any) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return value;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"'))) return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

// Parse any property on the object that looks like a JSON column (ends with 'JSON')
export function parseRowJsonFields<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const copy: any = { ...row };
  for (const key of Object.keys(copy)) {
    try {
      if (/JSON$/i.test(key) && typeof copy[key] === 'string') {
        copy[key] = tryParseJson(copy[key]);
      }
    } catch {}
  }
  return copy;
}

// Map over a recordset (array of rows) and parse JSON fields on each row
export function parseRecordsetJsonFields<T extends Record<string, any>>(rows: T[]): T[] {
  if (!Array.isArray(rows)) return rows as any;
  return rows.map((r) => parseRowJsonFields(r));
}

export default parseRowJsonFields;

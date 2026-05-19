/**
 * Minimal RFC 4180-compatible CSV parser:
 * - Supports quoted fields with embedded commas, newlines and "" escapes
 * - Trims surrounding whitespace on unquoted fields
 * - Returns headers separately from data rows
 */
export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (ch === "\r") {
      i += 1;
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  // Strip BOM from the first cell if present
  if (records[0]?.[0]?.charCodeAt(0) === 0xfeff) {
    records[0][0] = records[0][0].slice(1);
  }

  const nonEmpty = records.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1);
  return { headers, rows };
}

/**
 * Serializes a 2D table to a CSV string. Cells containing commas, quotes,
 * or newlines are quoted; embedded quotes are escaped as "".
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (cell: string | number | null | undefined): string => {
    const value = cell == null ? "" : String(cell);
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mimeType = "text/csv"): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

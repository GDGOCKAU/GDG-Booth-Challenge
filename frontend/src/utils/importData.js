// Readers for the files produced by exportData.js, so an export can be imported back.

export function parseCsv(text) {
  const source = text.replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

const u16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8);
const u32 = (bytes, offset) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

async function inflateRaw(data) {
  if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot read compressed Excel files. Try a recent Chrome, Edge, Firefox, or Safari.");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buffer) {
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (u32(bytes, offset) === 0x06054B50) { end = offset; break; }
  }
  if (end < 0) throw new Error("This file is not a valid Excel workbook.");
  const count = u16(bytes, end + 10);
  let offset = u32(bytes, end + 16);
  const decoder = new TextDecoder();
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    if (u32(bytes, offset) !== 0x02014B50) throw new Error("This Excel workbook is damaged.");
    const method = u16(bytes, offset + 10);
    const compressedSize = u32(bytes, offset + 20);
    const nameLength = u16(bytes, offset + 28);
    const extraLength = u16(bytes, offset + 30);
    const commentLength = u16(bytes, offset + 32);
    const localOffset = u32(bytes, offset + 42);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const dataStart = localOffset + 30 + u16(bytes, localOffset + 26) + u16(bytes, localOffset + 28);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    files.set(name, { method, raw });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return async (name) => {
    const file = files.get(name.replace(/^\//, ""));
    if (!file) return null;
    const data = file.method === 0 ? file.raw : file.method === 8 ? await inflateRaw(file.raw) : null;
    if (!data) throw new Error("This Excel workbook uses an unsupported compression method.");
    return decoder.decode(data);
  };
}

const parseXml = (text) => new DOMParser().parseFromString(text, "application/xml");
const byTag = (node, tag) => Array.from(node.getElementsByTagNameNS("*", tag));
const textOf = (node) => byTag(node, "t").map((item) => item.textContent).join("");

function columnIndex(ref) {
  const letters = String(ref || "").match(/^[A-Z]+/i)?.[0].toUpperCase() || "A";
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

// Returns { [sheetName]: rows[][] } for every worksheet in the workbook.
export async function readXlsx(buffer) {
  const read = await unzip(buffer);
  const workbook = await read("xl/workbook.xml");
  if (!workbook) throw new Error("This file is not a valid Excel workbook.");
  const relsXml = parseXml(await read("xl/_rels/workbook.xml.rels") || "<Relationships/>");
  const targets = new Map(byTag(relsXml, "Relationship").map((rel) => [rel.getAttribute("Id"), rel.getAttribute("Target")]));
  const sharedXml = await read("xl/sharedStrings.xml");
  const shared = sharedXml ? byTag(parseXml(sharedXml), "si").map(textOf) : [];
  const sheets = {};
  for (const sheet of byTag(parseXml(workbook), "sheet")) {
    const relId = sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || sheet.getAttribute("r:id");
    const target = targets.get(relId);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    const xml = await read(path);
    if (!xml) continue;
    sheets[sheet.getAttribute("name")] = byTag(parseXml(xml), "row").map((row) => {
      const cells = [];
      for (const cell of byTag(row, "c")) {
        const type = cell.getAttribute("t");
        const value = byTag(cell, "v")[0]?.textContent ?? "";
        let content;
        if (type === "s") content = shared[Number(value)] ?? "";
        else if (type === "inlineStr") content = textOf(cell);
        else if (type === "str" || type === "b" || type === "e") content = value;
        else content = value === "" ? "" : Number(value);
        cells[columnIndex(cell.getAttribute("r"))] = content;
      }
      return Array.from(cells, (value) => value ?? "");
    });
  }
  return sheets;
}

// Turns [[header...], [value...]] into objects keyed by header text.
export function rowsToObjects(rows) {
  const [header = [], ...body] = rows;
  const keys = header.map((cell) => String(cell).trim());
  return body.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index] ?? ""])));
}

import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

const decoder = new TextDecoder("utf-8");

function fail(message) {
  throw new Error(`XLSX inválido: ${message}`);
}

function viewOf(buffer) {
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function findEndOfCentralDirectory(buffer) {
  const view = viewOf(buffer);
  const minimumOffset = Math.max(0, buffer.byteLength - 65_557);
  for (let offset = buffer.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  fail("diretório central não encontrado");
}

function readZipEntries(buffer) {
  const view = viewOf(buffer);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const entries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      fail(`entrada central ${index + 1} corrompida`);
    }
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(buffer.subarray(offset + 46, offset + 46 + nameLength));

    entries.set(name.replaceAll("\\", "/"), {
      compressedSize,
      compressionMethod,
      localHeaderOffset,
      uncompressedSize,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readZipEntry(buffer, entry) {
  const view = viewOf(buffer);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) {
    fail("cabeçalho local corrompido");
  }
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  let result;
  if (entry.compressionMethod === 0) result = compressed;
  else if (entry.compressionMethod === 8) result = inflateRawSync(compressed);
  else fail(`compressão ${entry.compressionMethod} não suportada`);

  if (result.byteLength !== entry.uncompressedSize) {
    fail("tamanho descompactado divergente");
  }
  return result;
}

function decodeXml(value) {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, named) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      return {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        quot: '"',
      }[named.toLowerCase()] ?? entity;
    },
  );
}

function attributesOf(source) {
  const attributes = {};
  for (const match of source.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attributes[match[1]] = decodeXml(match[2]);
  }
  return attributes;
}

function tagValues(xml, localName) {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${localName}>`,
    "g",
  );
  return [...xml.matchAll(pattern)].map((match) => decodeXml(match[1].replace(/<[^>]+>/g, "")));
}

function columnIndex(reference) {
  const letters = /^[A-Z]+/i.exec(reference)?.[0]?.toUpperCase();
  if (!letters) fail(`referência de célula ${reference} inválida`);
  let result = 0;
  for (const character of letters) result = result * 26 + character.charCodeAt(0) - 64;
  return result - 1;
}

function parseCell(attributes, innerXml, sharedStrings) {
  const rawValue = tagValues(innerXml, "v")[0];
  const type = attributes.t ?? "n";
  if (type === "inlineStr") return tagValues(innerXml, "t").join("");
  if (rawValue === undefined) return null;
  if (type === "s") return sharedStrings[Number(rawValue)] ?? null;
  if (type === "b") return rawValue === "1";
  if (type === "str" || type === "e") return rawValue;
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : rawValue;
}

function parseWorksheet(xml, sharedStrings) {
  const rows = [];
  const rowPattern = /<(?:[\w.-]+:)?row\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?row>/g;
  for (const rowMatch of xml.matchAll(rowPattern)) {
    const rowAttributes = attributesOf(rowMatch[1]);
    const rowNumber = Number(rowAttributes.r);
    if (!Number.isSafeInteger(rowNumber) || rowNumber < 1) fail("linha sem número válido");
    const values = [];
    const cellPattern = /<(?:[\w.-]+:)?c\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/(?:[\w.-]+:)?c>)/g;
    for (const cellMatch of rowMatch[2].matchAll(cellPattern)) {
      const cellAttributes = attributesOf(cellMatch[1]);
      const index = columnIndex(cellAttributes.r ?? "");
      values[index] = parseCell(cellAttributes, cellMatch[2] ?? "", sharedStrings);
    }
    rows.push({ rowNumber, values });
  }
  return rows;
}

function recordsFromRows(rows) {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];
  const headers = headerRow.values.map((value) => String(value ?? "").trim());
  if (headers.every((value) => value === "")) return [];
  return dataRows
    .filter((row) => row.values.some((value) => value !== null && value !== undefined && value !== ""))
    .map((row) => ({
      rowNumber: row.rowNumber,
      values: Object.fromEntries(headers.map((header, index) => [header, row.values[index] ?? null])),
    }));
}

export async function readXlsx(filePath) {
  const buffer = await readFile(filePath);
  const entries = readZipEntries(buffer);
  const readText = (name, optional = false) => {
    const entry = entries.get(name.replace(/^\//, ""));
    if (!entry) {
      if (optional) return "";
      fail(`parte ${name} ausente`);
    }
    return decoder.decode(readZipEntry(buffer, entry)).replace(/^\uFEFF/, "");
  };

  const workbookXml = readText("xl/workbook.xml");
  const relationshipsXml = readText("xl/_rels/workbook.xml.rels");
  const sharedStringsXml = readText("xl/sharedStrings.xml", true);
  const sharedStrings = sharedStringsXml
    ? [...sharedStringsXml.matchAll(/<(?:[\w.-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?si>/g)]
      .map((match) => tagValues(match[1], "t").join(""))
    : [];

  const relationships = new Map();
  for (const match of relationshipsXml.matchAll(/<(?:[\w.-]+:)?Relationship\b([^>]*)\/?\s*>/g)) {
    const attributes = attributesOf(match[1]);
    if (attributes.Id && attributes.Target) {
      relationships.set(attributes.Id, attributes.Target.replace(/^\//, ""));
    }
  }

  const sheets = new Map();
  for (const match of workbookXml.matchAll(/<(?:[\w.-]+:)?sheet\b([^>]*)\/?\s*>/g)) {
    const attributes = attributesOf(match[1]);
    const name = attributes.name;
    const target = relationships.get(attributes["r:id"]);
    if (!name || !target) fail("aba sem nome ou relacionamento");
    const rows = parseWorksheet(readText(target), sharedStrings);
    sheets.set(name, { name, rows, records: recordsFromRows(rows) });
  }

  return { sheets };
}

export function excelSerialToDate(serial) {
  if (typeof serial !== "number" || !Number.isFinite(serial)) {
    throw new TypeError(`Serial Excel inválido: ${serial}`);
  }
  return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}

import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

export type DocType = 'pdf' | 'excel' | 'text';

export interface ExtractResult {
  text: string;
  pageCount?: number;
}

export async function extractText(buffer: Buffer, docType: DocType): Promise<ExtractResult> {
  switch (docType) {
    case 'pdf':
      return extractPdf(buffer);
    case 'excel':
      return { text: extractExcel(buffer) };
    case 'text':
      return { text: buffer.toString('utf-8') };
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const parser = new PDFParse({ data: buffer });

  // pdf-parse v2 can hang indefinitely on certain PDFs — guard with a hard timeout
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('PDF text extraction timed out after 60s')), 60_000),
  );

  const result = await Promise.race([parser.getText(), timeout]);
  return {
    text: result.text,
    pageCount: result.total,
  };
}

function extractExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return '';
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `=== Sheet: ${name} ===\n${csv}`;
  })
    .filter(Boolean)
    .join('\n\n');
}

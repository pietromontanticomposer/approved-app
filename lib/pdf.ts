interface PdfOptions {
  title?: string;
  linesPerPage?: number;
  fontSize?: number;
  marginX?: number;
  marginTop?: number;
  lineHeight?: number;
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function chunkLines(lines: string[], size: number) {
  const out: string[][] = [];
  for (let i = 0; i < lines.length; i += size) {
    out.push(lines.slice(i, i + size));
  }
  return out.length ? out : [[]];
}

export function buildSimplePdf(lines: string[], options: PdfOptions = {}): Buffer {
  const title = options.title ? String(options.title) : '';
  const fontSize = options.fontSize || 12;
  const marginX = options.marginX || 50;
  const marginTop = options.marginTop || 760;
  const lineHeight = options.lineHeight || 16;
  const linesPerPage = options.linesPerPage || 40;

  const allLines = title ? [title, '', ...lines] : [...lines];
  const pages = chunkLines(allLines, linesPerPage);

  const objects: string[] = [];
  const offsets: number[] = [];

  const addObj = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  // 1) Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  // 2) Pages (placeholder, updated later)
  addObj('<< /Type /Pages /Kids [] /Count 0 >>');
  // 3) Font
  const fontObjId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageObjectIds: number[] = [];

  pages.forEach((pageLines) => {
    const contentLines = pageLines.map((line, idx) => {
      const y = marginTop - idx * lineHeight;
      const safe = escapePdfText(line || '');
      return `BT /F1 ${fontSize} Tf ${marginX} ${y} Td (${safe}) Tj ET`;
    });

    const stream = contentLines.join('\n');
    const contentObj = addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageObj = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pageObjectIds.push(pageObj);
  });

  // Update pages object
  const kids = pageObjectIds.map(id => `${id} 0 R`).join(' ');
  objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageObjectIds.length} >>`;

  // Build PDF
  let pdf = '%PDF-1.4\n';
  objects.forEach((obj, idx) => {
    offsets[idx + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    const offset = offsets[i] || 0;
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefStart}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'utf8');
}

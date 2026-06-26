import { Router } from 'express';
import multer from 'multer';
import { extractText, type DocType } from '../lib/extractText.js';
import { extractLineItems } from '../agents/extractor.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const router = Router();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { supplierId, projectId, docId, supplierName, currency, context } = req.body as Record<string, string>;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    if (!supplierName) {
      res.status(400).json({ error: 'supplierName is required' });
      return;
    }

    const docType = inferDocType(req.file.originalname, req.file.mimetype);
    console.log(`[parse] "${req.file.originalname}" — ${req.file.size} bytes, type: ${docType}, supplier: "${supplierName}"`);

    let text: string;
    let pageCount: number | undefined;
    try {
      ({ text, pageCount } = await extractText(req.file.buffer, docType));
      console.log(`[parse] Text extracted: ${text.length} chars${pageCount != null ? `, ${pageCount} pages` : ''}`);
    } catch (extractErr) {
      const msg = extractErr instanceof Error ? extractErr.message : String(extractErr);
      console.error(`[parse] extractText FAILED for "${req.file.originalname}":`, msg);
      throw extractErr;
    }

    if (!text.trim()) {
      res.status(422).json({ error: 'Could not extract text from document. It may be scanned or image-only.' });
      return;
    }

    let items: Awaited<ReturnType<typeof extractLineItems>>;
    try {
      items = await extractLineItems({
        content: text,
        supplierName,
        currency: currency || undefined,
        docType,
        context: context || undefined,
      });
      console.log(`[parse] extractLineItems OK: ${items.length} items`);
    } catch (extractItemsErr) {
      const msg = extractItemsErr instanceof Error ? extractItemsErr.message : String(extractItemsErr);
      console.error(`[parse] extractLineItems FAILED for "${req.file.originalname}":`, msg);
      throw extractItemsErr;
    }

    res.json({
      items,
      rawText: text,
      meta: {
        docId,
        supplierId,
        projectId,
        fileName: req.file.originalname,
        docType,
        pageCount,
        charCount: text.length,
        itemCount: items.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    console.error('[parse] Unhandled error:', message);
    res.status(500).json({ error: message });
  }
});

function inferDocType(filename: string, mimetype: string): DocType {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf') || mimetype === 'application/pdf') return 'pdf';
  if (name.match(/\.xlsx?$/) || name.endsWith('.csv') || mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'excel';
  return 'text';
}

export default router;

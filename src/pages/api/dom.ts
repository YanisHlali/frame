import { promises as fs } from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const tmpDir = process.env.NODE_ENV === 'production' ? '/tmp' : './tmp';

  try {
    const files = await fs.readdir(tmpDir);
    const dumps = files
      .filter((f) => f.startsWith('error_dom_dump_') && f.endsWith('.html'))
      .sort((a, b) => b.localeCompare(a));

    if (dumps.length === 0) {
      return res.status(404).json({ error: 'No HTML dump found.' });
    }

    const lastDumpPath = path.join(tmpDir, dumps[0]);
    const html = await fs.readFile(lastDumpPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).json({ error: 'Error reading HTML dump.' });
  }
}

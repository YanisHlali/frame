import { promises as fs } from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const filePath = path.join(process.env.NODE_ENV === 'production' ? '/tmp' : './tmp', 'vercel_debug_screenshot.png');

  try {
    const imageBuffer = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(imageBuffer);
  } catch (e) {
    res.status(404).json({ error: 'No screenshot found.' });
  }
}

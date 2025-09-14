import type { NextApiRequest, NextApiResponse } from "next";
import { startScheduledTweeting } from "@/scheduler/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = req.headers.authorization;

  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    await startScheduledTweeting();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

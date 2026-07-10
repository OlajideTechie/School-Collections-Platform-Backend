import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { dashboardService } from './dashboard.service';

function parseRecentPaymentsLimit(value: unknown): number | undefined {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

export const dashboardController = {
  async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const overview = await dashboardService.getOverview(schoolId, {
        recentPaymentsLimit: parseRecentPaymentsLimit(req.query.recentLimit),
      });

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error: unknown) {
      console.error('Error fetching dashboard overview:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};

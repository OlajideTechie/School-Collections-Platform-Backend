import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { dashboardService } from './dashboard.service';

const DEFAULT_RECENT_PAYMENTS_PAGE = 1;
const DEFAULT_RECENT_PAYMENTS_LIMIT = 5;
const MAX_RECENT_PAYMENTS_LIMIT = 20;

function parsePositiveInt(value: unknown, fallback: number): number {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseRecentPaymentsPagination(input: {
  page?: unknown;
  limit?: unknown;
  recentLimit?: unknown;
}) {
  const page = parsePositiveInt(input.page, DEFAULT_RECENT_PAYMENTS_PAGE);
  const limit = Math.min(
    parsePositiveInt(
      input.limit ?? input.recentLimit,
      DEFAULT_RECENT_PAYMENTS_LIMIT
    ),
    MAX_RECENT_PAYMENTS_LIMIT
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
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
        recentPaymentsPagination: parseRecentPaymentsPagination({
          page: req.query.page,
          limit: req.query.limit,
          recentLimit: req.query.recentLimit,
        }),
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

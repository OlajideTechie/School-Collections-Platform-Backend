import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { notificationService } from './notification.service';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

export const notificationController = {
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const pagination = parsePagination({
        page: req.query.page,
        limit: req.query.limit,
      });

      const notifications = await notificationService.getNotificationsPaginated(schoolId, {
        skip: pagination.skip,
        limit: pagination.limit,
      });

      res.status(200).json({
        success: true,
        data: notifications.data,
        pagination: buildPaginationMeta(pagination, notifications.total),
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};

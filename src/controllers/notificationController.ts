import { Request, Response } from 'express';
import notificationService from '../services/notificationService';

class NotificationController {
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { notifications, total } = await notificationService.getUserNotifications(userId, page, limit);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des notifications',
      });
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de notifications non lues:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du nombre de notifications non lues',
      });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const success = await notificationService.markAsRead(parseInt(id), userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Notification non trouvée',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Notification marquée comme lue',
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage de la notification comme lue',
      });
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      const affectedRows = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: `${affectedRows} notifications marquées comme lues`,
      });
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du marquage de toutes les notifications comme lues',
      });
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const success = await notificationService.deleteNotification(parseInt(id), userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Notification non trouvée',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Notification supprimée',
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la notification',
      });
    }
  }
}

export default new NotificationController();

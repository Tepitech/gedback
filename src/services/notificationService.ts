import nodemailer from 'nodemailer';
import { Notification } from '../models';
import { User } from '../models';
import { sequelize } from '../config/database';

interface CreateNotificationData {
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'document' | 'approval' | 'system';
  entityType?: string;
  entityId?: number;
}

class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const notification = await Notification.create(data);
    return notification;
  }

  async createAndSendNotification(data: CreateNotificationData, sendEmail: boolean = false): Promise<Notification> {
    const notification = await this.createNotification(data);

    if (sendEmail) {
      await this.sendEmailNotification(notification);
    }

    return notification;
  }

  async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      const user = await User.findByPk(notification.userId);
      if (!user || !user.email) return;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@ged.com',
        to: user.email,
        subject: notification.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Cet email a été envoyé automatiquement par le système GED.
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      await notification.update({ isEmailSent: true });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  }

  async getUserNotifications(userId: number, page: number = 1, limit: number = 20): Promise<{ notifications: Notification[]; total: number }> {
    const offset = (page - 1) * limit;
    const { rows: notifications, count: total } = await Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { notifications, total };
  }

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) return false;

    await notification.update({ isRead: true });
    return true;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const [affectedRows] = await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    return affectedRows;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await Notification.count({
      where: { userId, isRead: false },
    });
  }

  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    const deletedRows = await Notification.destroy({
      where: { id: notificationId, userId },
    });
    return deletedRows > 0;
  }

  // Méthodes utilitaires pour créer des notifications spécifiques
  async notifyDocumentUploaded(userId: number, documentTitle: string, documentId: number): Promise<Notification> {
    return this.createAndSendNotification({
      userId,
      title: 'Document téléchargé',
      message: `Le document "${documentTitle}" a été téléchargé avec succès.`,
      type: 'document',
      entityType: 'document',
      entityId: documentId,
    }, true);
  }

  async notifyDocumentApproved(userId: number, documentTitle: string, documentId: number): Promise<Notification> {
    return this.createAndSendNotification({
      userId,
      title: 'Document approuvé',
      message: `Le document "${documentTitle}" a été approuvé.`,
      type: 'approval',
      entityType: 'document',
      entityId: documentId,
    }, true);
  }

  async notifyDocumentRejected(userId: number, documentTitle: string, documentId: number, reason?: string): Promise<Notification> {
    return this.createAndSendNotification({
      userId,
      title: 'Document rejeté',
      message: `Le document "${documentTitle}" a été rejeté.${reason ? ` Raison: ${reason}` : ''}`,
      type: 'warning',
      entityType: 'document',
      entityId: documentId,
    }, true);
  }

  async notifySystemMaintenance(userId: number, message: string): Promise<Notification> {
    return this.createNotification({
      userId,
      title: 'Maintenance système',
      message,
      type: 'system',
    });
  }
}

export default new NotificationService();

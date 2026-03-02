import { Response } from 'express';
import { Op } from 'sequelize';
import { Document, DocumentVersion, Category, User, Tag, AuditLog } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs';

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, categoryId, status, fromDate, toDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { is_deleted: false };
    if (status) where.status = status;
    if (categoryId) where.category_id = categoryId;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { original_name: { [Op.like]: `%${search}%` } }
      ];
    }
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at[Op.gte] = fromDate;
      if (toDate) where.created_at[Op.lte] = toDate;
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] } },
      ],
      attributes: { exclude: ['ocr_text'] },
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    const documents = rows.map((doc: any) => transformDocument(doc));

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages: Math.ceil(count / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('GetDocuments error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents',
    });
  }
};

export const getDocumentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Tag, as: 'tags' },
        { model: DocumentVersion, as: 'versions', limit: 10, order: [['version_number', 'DESC']] },
      ],
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'VIEW',
      entity_type: 'document',
      entity_id: document.id,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Consultation du document: ${document.title}`,
    });

    res.json({
      success: true,
      data: transformDocument(document),
    });
  } catch (error) {
    logger.error('GetDocumentById error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du document',
    });
  }
};

export const createDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Aucun fichier uploadé',
      });
      return;
    }

    const { title, categoryId, tags, metadata, status } = req.body;

    const ext = path.extname(req.file.originalname).toLowerCase();
    const document = await Document.create({
      title: title || req.file.originalname,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      extension: ext,
      size: req.file.size,
      path: req.file.path,
      category_id: categoryId || null,
      uploaded_by: req.user?.id || 1,
      status: status || 'draft',
      metadata: metadata ? JSON.parse(metadata) : null,
    });

    if (tags) {
      const tagIds = Array.isArray(tags) ? tags : JSON.parse(tags);
      if (tagIds.length > 0) {
        await document.setTags(tagIds);
      }
    }

    await DocumentVersion.create({
      document_id: document.id,
      version_number: 1,
      filename: document.filename,
      original_name: document.original_name,
      mime_type: document.mime_type,
      size: document.size,
      path: document.path,
      uploaded_by: req.user?.id || 1,
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'CREATE',
      entity_type: 'document',
      entity_id: document.id,
      new_values: { title: document.title, originalName: document.original_name },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Upload du document: ${document.title}`,
    });

    const fullDocument = await Document.findByPk(document.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'uploader' },
        { model: Tag, as: 'tags' },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès',
      data: transformDocument(fullDocument),
    });
  } catch (error) {
    logger.error('CreateDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du document',
    });
  }
};

export const updateDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, categoryId, tags, metadata, status } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    const oldValues = {
      title: document.title,
      categoryId: document.category_id,
      status: document.status,
    };

    await document.update({
      title: title || document.title,
      category_id: categoryId !== undefined ? categoryId : document.category_id,
      status: status || document.status,
      metadata: metadata ? JSON.parse(metadata) : document.metadata,
    });

    if (tags) {
      const tagIds = Array.isArray(tags) ? tags : JSON.parse(tags);
      await document.setTags(tagIds);
    }

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity_type: 'document',
      entity_id: document.id,
      old_values: oldValues,
      new_values: { title, categoryId, status, metadata },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Modification du document: ${document.title}`,
    });

    const updatedDocument = await Document.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'uploader' },
        { model: Tag, as: 'tags' },
      ],
    });

    res.json({
      success: true,
      message: 'Document mis à jour avec succès',
      data: transformDocument(updatedDocument),
    });
  } catch (error) {
    logger.error('UpdateDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du document',
    });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    if (permanent === 'true') {
      const resolvedPath = resolveFilePath(document.path);
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
      await document.destroy();

      await AuditLog.create({
        user_id: req.user?.id,
        action: 'DELETE_PERMANENT',
        entity_type: 'document',
        entity_id: document.id,
        old_values: { title: document.title },
        ip_address: req.ip || undefined,
        user_agent: req.headers['user-agent'] || undefined,
        description: `Suppression permanente du document: ${document.title}`,
      });
    } else {
      await document.update({
        is_deleted: true,
        deleted_at: new Date(),
      });

      await AuditLog.create({
        user_id: req.user?.id,
        action: 'DELETE',
        entity_type: 'document',
        entity_id: document.id,
        ip_address: req.ip || undefined,
        user_agent: req.headers['user-agent'] || undefined,
        description: `Suppression (corbeille) du document: ${document.title}`,
      });
    }

    res.json({
      success: true,
      message: permanent === 'true' ? 'Document supprimé définitivement' : 'Document déplacé dans la corbeille',
    });
  } catch (error) {
    logger.error('DeleteDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document',
    });
  }
};

export const restoreDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    await document.update({
      is_deleted: false,
      deleted_at: null,
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'RESTORE',
      entity_type: 'document',
      entity_id: document.id,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Restauration du document: ${document.title}`,
    });

    res.json({
      success: true,
      message: 'Document restauré avec succès',
      data: transformDocument(document),
    });
  } catch (error) {
    logger.error('RestoreDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la restauration du document',
    });
  }
};

export const archiveDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    await document.update({
      is_archived: true,
      archived_at: new Date(),
      status: 'archived',
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'ARCHIVE',
      entity_type: 'document',
      entity_id: document.id,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Archivage du document: ${document.title}`,
    });

    res.json({
      success: true,
      message: 'Document archivé avec succès',
      data: transformDocument(document),
    });
  } catch (error) {
    logger.error('ArchiveDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'archivage du document',
    });
  }
};

export const approveDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    await document.update({ status: 'approved' });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'APPROVE',
      entity_type: 'document',
      entity_id: document.id,
      new_values: { comments },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Approbation du document: ${document.title}`,
    });

    res.json({
      success: true,
      message: 'Document approuvé',
      data: transformDocument(document),
    });
  } catch (error) {
    logger.error('ApproveDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'approbation du document',
    });
  }
};

export const rejectDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    await document.update({ status: 'rejected' });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'REJECT',
      entity_type: 'document',
      entity_id: document.id,
      new_values: { reason },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Rejet du document: ${document.title}`,
    });

    res.json({
      success: true,
      message: 'Document rejeté',
      data: transformDocument(document),
    });
  } catch (error) {
    logger.error('RejectDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet du document',
    });
  }
};

export const getDocumentVersions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const versions = await DocumentVersion.findAll({
      where: { document_id: id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }],
      order: [['version_number', 'DESC']],
    });

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    logger.error('GetDocumentVersions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des versions',
    });
  }
};

// Helper function to resolve file path
const resolveFilePath = (filePath: string): string => {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(process.cwd(), filePath);
};

// Helper function to transform Document from snake_case to camelCase
const transformDocument = (doc: any) => {
  if (!doc) return null;
  return {
    id: doc.id,
    title: doc.title,
    filename: doc.filename,
    originalName: doc.original_name,
    mimeType: doc.mime_type,
    extension: doc.extension,
    size: doc.size,
    path: doc.path,
    checksum: doc.checksum,
    categoryId: doc.category_id,
    category: doc.category ? { id: doc.category.id, name: doc.category.name } : undefined,
    uploadedBy: doc.uploaded_by,
    uploader: doc.uploader ? {
      id: doc.uploader.id,
      firstName: doc.uploader.first_name,
      lastName: doc.uploader.last_name,
      email: doc.uploader.email
    } : undefined,
    status: doc.status,
    isArchived: doc.is_archived,
    isDeleted: doc.is_deleted,
    deletedAt: doc.deleted_at,
    archivedAt: doc.archived_at,
    metadata: doc.metadata,
    tags: doc.tags || [],
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  };
};

export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    const resolvedPath = resolveFilePath(document.path);
    
    if (!fs.existsSync(resolvedPath)) {
      logger.error(`File not found: ${resolvedPath}, original path: ${document.path}`);
      res.status(404).json({
        success: false,
        message: 'Fichier physique non trouvé',
      });
      return;
    }

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'DOWNLOAD',
      entity_type: 'document',
      entity_id: document.id,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Téléchargement du document: ${document.title}`,
    });

    res.download(resolvedPath, document.original_name);
  } catch (error) {
    logger.error('DownloadDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement',
    });
  }
};

export const previewDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document non trouvé',
      });
      return;
    }

    const resolvedPath = resolveFilePath(document.path);
    
    if (!fs.existsSync(resolvedPath)) {
      logger.error(`File not found: ${resolvedPath}, original path: ${document.path}`);
      res.status(404).json({
        success: false,
        message: 'Fichier physique non trouvé',
      });
      return;
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = document.extension?.toLowerCase();
    
    if (ext && imageExtensions.includes(ext)) {
      res.setHeader('Content-Type', document.mime_type || 'image/jpeg');
      const fileBuffer = fs.readFileSync(resolvedPath);
      res.send(fileBuffer);
    } else if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      const fileBuffer = fs.readFileSync(resolvedPath);
      res.send(fileBuffer);
    } else {
      res.json({
        success: false,
        message: 'Aperçu non disponible pour ce type de fichier',
        supportsPreview: false,
      });
      return;
    }

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'PREVIEW',
      entity_type: 'document',
      entity_id: document.id,
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Aperçu du document: ${document.title}`,
    });
  } catch (error) {
    logger.error('PreviewDocument error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'aperçu',
    });
  }
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get total documents count (not deleted)
    const totalDocuments = await Document.count({
      where: { is_deleted: false }
    });

    // Get total categories count
    const totalCategories = await Category.count();

    // Get pending approval count
    const pendingApproval = await Document.count({
      where: {
        is_deleted: false,
        status: 'pending'
      }
    });

    // Get approved count
    const approved = await Document.count({
      where: {
        is_deleted: false,
        status: 'approved'
      }
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        totalCategories,
        pendingApproval,
        approved
      }
    });
  } catch (error) {
    logger.error('GetStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};

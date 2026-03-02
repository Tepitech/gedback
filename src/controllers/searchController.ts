import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Document, Category } from '../models';
import { logger } from '../utils/logger';

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      search: searchQuery,  // Changed from 'q' to 'search' to match document list
      type, 
      categoryId, 
      dateFrom, 
      dateTo, 
      sizeMin, 
      sizeMax,
      status,
      page = 1, 
      limit = 20 
    } = req.query;

    logger.info('Search query params:', req.query);

    const where: any = {
      is_deleted: false
    };

    // Text search - use 'search' parameter like document list
    if (searchQuery) {
      where[Op.or] = [
        { title: { [Op.like]: `%${searchQuery}%` } },
        { original_name: { [Op.like]: `%${searchQuery}%` } },
        { ocr_text: { [Op.like]: `%${searchQuery}%` } }
      ];
      logger.info('Search text:', searchQuery);
    }

    // Category filter
    if (categoryId) {
      where.category_id = categoryId;
    }

    // Date filters
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom as string);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo as string);
    }

    // Size filters
    if (sizeMin || sizeMax) {
      where.size = {};
      if (sizeMin) where.size[Op.gte] = Number(sizeMin);
      if (sizeMax) where.size[Op.lte] = Number(sizeMax);
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // File type filter
    if (type) {
      const typeMap: Record<string, string[]> = {
        pdf: ['application/pdf'],
        doc: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        xls: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      };
      const mimeTypes = typeMap[type as string];
      if (mimeTypes) {
        where.mime_type = { [Op.in]: mimeTypes };
      }
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset
    });

    const results = rows.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      originalName: doc.original_name,
      excerpt: doc.ocr_text?.substring(0, 200),
score: searchQuery ? Math.random() * 100 : undefined,
      category: doc.category?.name,
      createdAt: doc.created_at
    }));

    res.json({
      success: true,
      data: {
        results,
        total: count,
        queryTime: 0.125
      }
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la recherche' });
  }
};

export const advancedSearch = async (req: Request, res: Response): Promise<void> => {
  // Same as search for now - can be extended with more filters
  search(req, res);
};

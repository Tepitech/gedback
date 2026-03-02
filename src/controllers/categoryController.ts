import { Response } from 'express';
import { Category, Document, User, AuditLog } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

// Helper function to build category tree
// Fixed version: prevents circular references and counts actual documents
const buildCategoryTree = (
  categories: Category[], 
  parentId: number | null = null,
  visited: Set<number> = new Set()
): any[] => {
  // Prevent infinite recursion from circular references
  if (parentId !== null && visited.has(parentId)) {
    logger.warn(`Circular reference detected for category ID: ${parentId}`);
    return [];
  }

  // Add current parentId to visited set
  if (parentId !== null) {
    visited.add(parentId);
  }

  return categories
    .filter(cat => cat.parent_id === parentId)
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parent_id,
      description: cat.description,
      path: cat.path,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sort_order,
      createdBy: cat.created_by,
      isSystem: cat.is_system,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
      children: buildCategoryTree(categories, cat.id, new Set(visited)),
      // documentCount will be calculated properly in the getCategoryTree controller
      documentCount: 0
    }));
};

// Get all categories
export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tree, parentId, search } = req.query;

    const where: any = {};
    
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }

    if (parentId) {
      where.parent_id = parentId;
    }
    // Note: Removed the filter that was limiting to root categories only (parent_id = null)
    // Now returns all categories for dropdown usage

    const categories = await Category.findAll({
      where,
      include: [
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'first_name', 'last_name', 'email'] 
        }
      ],
      order: [
        ['sort_order', 'ASC'],
        ['name', 'ASC']
      ]
    });

    let responseData;
    
    if (tree === 'true') {
      // Build tree structure
      const flatCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        description: cat.description,
        path: cat.path,
        icon: cat.icon,
        color: cat.color,
        sort_order: cat.sort_order,
        created_by: cat.created_by,
        is_system: cat.is_system,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        creator: (cat as any).creator
      }));
      
      responseData = buildCategoryTree(flatCategories as any);
    } else {
      responseData = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        parentId: cat.parent_id,
        description: cat.description,
        path: cat.path,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sort_order,
        createdBy: cat.created_by,
        creator: (cat as any).creator ? {
          id: (cat as any).creator.id,
          firstName: (cat as any).creator.first_name,
          lastName: (cat as any).creator.last_name,
          email: (cat as any).creator.email
        } : undefined,
        isSystem: cat.is_system,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      }));
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('GetCategories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories'
    });
  }
};

// Get category by ID
export const getCategoryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'first_name', 'last_name', 'email'] 
        },
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'children',
          attributes: ['id', 'name']
        }
      ]
    }) as any;

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        parentId: category.parent_id,
        parent: category.parent ? {
          id: category.parent.id,
          name: category.parent.name
        } : undefined,
        description: category.description,
        path: category.path,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sort_order,
        createdBy: category.created_by,
        creator: category.creator ? {
          id: category.creator.id,
          firstName: category.creator.first_name,
          lastName: category.creator.last_name,
          email: category.creator.email
        } : undefined,
        isSystem: category.is_system,
        children: category.children ? category.children.map((child: any) => ({
          id: child.id,
          name: child.name
        })) : [],
        createdAt: category.created_at,
        updatedAt: category.updated_at
      }
    });
  } catch (error) {
    logger.error('GetCategoryById error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la catégorie'
    });
  }
};

// Get documents in a category
export const getCategoryDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
      return;
    }

    // Get all child category IDs
    const getAllChildIds = async (parentId: number): Promise<number[]> => {
      const children = await Category.findAll({ where: { parent_id: parentId } });
      let ids = children.map(c => c.id);
      for (const child of children) {
        const childIds = await getAllChildIds(child.id);
        ids = [...ids, ...childIds];
      }
      return ids;
    };

    const categoryIds = [id, ...await getAllChildIds(Number(id))];

    const { count, rows } = await Document.findAndCountAll({
      where: {
        category_id: { [Op.in]: categoryIds },
        is_deleted: false
      },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      attributes: { exclude: ['ocr_text'] },
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        documents: rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count,
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('GetCategoryDocuments error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
};

// Create category
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, parentId, description, icon, color, sortOrder } = req.body;

    // Check if category name already exists at same level
    const existingCategory = await Category.findOne({
      where: {
        name,
        parent_id: parentId || null
      }
    });

    if (existingCategory) {
      res.status(409).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà au même niveau'
      });
      return;
    }

    // Build path
    let path = '/';
    if (parentId) {
      const parent = await Category.findByPk(parentId);
      if (parent) {
        path = `${parent.path}${parent.id}/`;
      }
    }

    const category = await Category.create({
      name,
      parent_id: parentId || null,
      description: description || null,
      path,
      icon: icon || null,
      color: color || null,
      sort_order: sortOrder || 0,
      created_by: req.user?.id || 1,
      is_system: false
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'CREATE',
      entity_type: 'category',
      entity_id: category.id,
      new_values: { name, parentId, description },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Création de la catégorie: ${name}`
    });

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: {
        id: category.id,
        name: category.name,
        parentId: category.parent_id,
        description: category.description,
        path: category.path,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sort_order,
        createdBy: category.created_by,
        isSystem: category.is_system,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      }
    });
  } catch (error) {
    logger.error('CreateCategory error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la catégorie'
    });
  }
};

// Update category
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, parentId, description, icon, color, sortOrder } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
      return;
    }

    if (category.is_system) {
      res.status(403).json({
        success: false,
        message: 'Impossible de modifier une catégorie système'
      });
      return;
    }

    // Prevent circular reference
    if (parentId && Number(parentId) === Number(id)) {
      res.status(400).json({
        success: false,
        message: 'Une catégorie ne peut pas être son propre parent'
      });
      return;
    }

    const oldValues = {
      name: category.name,
      parentId: category.parent_id,
      description: category.description,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sort_order
    };

    // Build new path if parent changed
    let newPath = category.path;
    if (parentId !== undefined && Number(parentId) !== Number(category.parent_id)) {
      if (parentId) {
        const parent = await Category.findByPk(parentId);
        if (parent) {
          newPath = `${parent.path}${parent.id}/`;
        }
      } else {
        newPath = '/';
      }
    }

    await category.update({
      name: name || category.name,
      parent_id: parentId !== undefined ? (parentId || null) : category.parent_id,
      description: description !== undefined ? description : category.description,
      path: newPath,
      icon: icon !== undefined ? icon : category.icon,
      color: color !== undefined ? color : category.color,
      sort_order: sortOrder !== undefined ? sortOrder : category.sort_order
    });

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity_type: 'category',
      entity_id: category.id,
      old_values: oldValues,
      new_values: { name, parentId, description, icon, color, sortOrder },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Modification de la catégorie: ${category.name}`
    });

    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: {
        id: category.id,
        name: category.name,
        parentId: category.parent_id,
        description: category.description,
        path: category.path,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sort_order,
        createdBy: category.created_by,
        isSystem: category.is_system,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      }
    });
  } catch (error) {
    logger.error('UpdateCategory error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la catégorie'
    });
  }
};

// Delete category
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { moveChildrenTo } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
      return;
    }

    if (category.is_system) {
      res.status(403).json({
        success: false,
        message: 'Impossible de supprimer une catégorie système'
      });
      return;
    }

    // Check if category has documents
    const documentCount = await Document.count({
      where: { category_id: id, is_deleted: false }
    });

    if (documentCount > 0) {
      res.status(409).json({
        success: false,
        message: `Impossible de supprimer cette catégorie car elle contient ${documentCount} document(s). Déplacez-les d'abord.`
      });
      return;
    }

    // Check if category has children
    const childrenCount = await Category.count({
      where: { parent_id: id }
    });

    if (childrenCount > 0) {
      if (moveChildrenTo) {
        // Move children to new parent
        await Category.update(
          { parent_id: moveChildrenTo },
          { where: { parent_id: id } }
        );
      } else {
        res.status(409).json({
          success: false,
          message: `Cette catégorie contient ${childrenCount} sous-catégorie(s). Spécifiez moveChildrenTo pour les déplacer.`
        });
        return;
      }
    }

    await category.destroy();

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'DELETE',
      entity_type: 'category',
      entity_id: Number(id),
      old_values: { name: category.name },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: `Suppression de la catégorie: ${category.name}`
    });

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    logger.error('DeleteCategory error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la catégorie'
    });
  }
};

// Get category tree (flat list with hierarchy info)
export const getCategoryTree = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Starting getCategoryTree request');
    
    const categories = await Category.findAll({
      include: [
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'first_name', 'last_name', 'email'] 
        }
      ],
      order: [
        ['sort_order', 'ASC'],
        ['name', 'ASC']
      ]
    });

    logger.info(`Found ${categories.length} categories`);

    // Get document counts for each category
    const documentCounts = await Document.findAll({
      attributes: [
        'category_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { is_deleted: false },
      group: ['category_id'],
      raw: true
    }) as any;

    // Create a map of category_id -> document count
    const countMap = new Map<number, number>();
    documentCounts.forEach((dc: any) => {
      countMap.set(dc.category_id, parseInt(dc.count, 10));
    });

    logger.info(`Document counts fetched: ${documentCounts.length} categories with documents`);

    // Build nested tree with document counts
    const tree = buildCategoryTreeWithCounts(categories as any, null, new Set(), countMap);

    logger.info('Category tree built successfully');
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    logger.error('GetCategoryTree error:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'arborescence',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
};

// Helper function to build category tree with document counts
const buildCategoryTreeWithCounts = (
  categories: Category[], 
  parentId: number | null,
  visited: Set<number>,
  countMap: Map<number, number>
): any[] => {
  // Prevent infinite recursion from circular references
  if (parentId !== null && visited.has(parentId)) {
    logger.warn(`Circular reference detected for category ID: ${parentId}`);
    return [];
  }

  // Add current parentId to visited set
  if (parentId !== null) {
    visited.add(parentId);
  }

  return categories
    .filter(cat => cat.parent_id === parentId)
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parent_id,
      description: cat.description,
      path: cat.path,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sort_order,
      createdBy: cat.created_by,
      isSystem: cat.is_system,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
      // Get document count from the map (0 if no documents)
      documentCount: countMap.get(cat.id) || 0,
      children: buildCategoryTreeWithCounts(categories, cat.id, new Set(visited), countMap)
    }));
};

// Reorder categories
export const reorderCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({
        success: false,
        message: 'Le format des données est invalide'
      });
      return;
    }

    for (const item of items) {
      await Category.update(
        { sort_order: item.sortOrder, parent_id: item.parentId || null },
        { where: { id: item.id } }
      );
    }

    await AuditLog.create({
      user_id: req.user?.id,
      action: 'UPDATE',
      entity_type: 'category',
      entity_id: -1,
      new_values: { action: 'reorder', items },
      ip_address: req.ip || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      description: 'Réorganisation des catégories'
    });

    res.json({
      success: true,
      message: 'Catégories réorganisées avec succès'
    });
  } catch (error) {
    logger.error('ReorderCategories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réorganisation des catégories'
    });
  }
};

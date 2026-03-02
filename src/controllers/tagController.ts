import { Request, Response } from 'express';
import { Tag } from '../models';
import { logger } from '../utils/logger';

export const getTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await Tag.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    logger.error('Get tags error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des tags' });
  }
};

export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Le nom du tag est requis' });
      return;
    }

    const tag = await Tag.create({
      name,
      color: color || '#6c757d'
    });

    res.status(201).json({
      success: true,
      data: tag,
      message: 'Tag créé avec succès'
    });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ success: false, message: 'Ce tag existe déjà' });
      return;
    }
    logger.error('Create tag error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du tag' });
  }
};

export const updateTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const tag = await Tag.findByPk(id);
    if (!tag) {
      res.status(404).json({ success: false, message: 'Tag non trouvé' });
      return;
    }

    await tag.update({
      name: name || tag.name,
      color: color || tag.color
    });

    res.json({
      success: true,
      data: tag,
      message: 'Tag mis à jour avec succès'
    });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ success: false, message: 'Ce tag existe déjà' });
      return;
    }
    logger.error('Update tag error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du tag' });
  }
};

export const deleteTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tag = await Tag.findByPk(id);
    if (!tag) {
      res.status(404).json({ success: false, message: 'Tag non trouvé' });
      return;
    }

    await tag.destroy();

    res.json({
      success: true,
      message: 'Tag supprimé avec succès'
    });
  } catch (error) {
    logger.error('Delete tag error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du tag' });
  }
};

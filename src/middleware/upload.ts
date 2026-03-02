import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Response, Request } from 'express';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
};

// Get the base upload path and ensure it exists
const getBaseUploadPath = (): string => {
  // Resolve to absolute path if relative
  let basePath = config.upload.path;
  
  // If relative path, make it relative to project root
  if (!path.isAbsolute(basePath)) {
    basePath = path.join(process.cwd(), basePath);
  }
  
  // Ensure the base uploads directory exists
  ensureDirectoryExists(basePath);
  
  return basePath;
};

// Configuration du stockage avec création automatique des répertoires
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    try {
      // Get subdirectory based on current date (year/month)
      const date = new Date();
      const yearSubDir = date.getFullYear().toString();
      const monthSubDir = String(date.getMonth() + 1).padStart(2, '0');
      
      // Build full directory path with year/month subdirectories 
      let fullUploadDir = config.upload.path;
      
      // Convert relative paths to absolute for proper handling across environments
      if (!path.isAbsolute(fullUploadDir)) {
        fullUploadDir = path.join(process.cwd(), fullUploadDir);
      }
      
      // Add year and month subdirectories
      fullUploadDir = path.join(fullUploadDir, 'documents', yearSubDir, monthSubDir);
      
      // Ensure this specific dated subdirectory structure is present before file write
      ensureDirectoryExists(fullUploadDir);
      
      cb(null, fullUploadDir);
    } catch (err) {
      logger.error('Error in destination:', err);
      cb(err as Error, 'uploads/documents');
    }
  },
  
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    try {
      // Generate unique identifier for this specific uploaded version of document
      const uniqueId = uuidv4().substring(0, 8);
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Return just filename portion
      cb(null, `${uniqueId}${ext}`);
    } catch (err) {
      logger.error('Error generating filename:', err);
      cb(err as Error, '');
    }
  }
});

// Filter pour les types de fichiers autorisés
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = config.upload.allowedMimeTypes;
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Types autorisés: ${allowedMimeTypes.join(', ')}`));
  }
};

// Configuration Multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Initialize upload directory on module load
getBaseUploadPath();

// Middleware de gestion des erreurs Multer
export const handleMulterError = (err: Error, req: Request, res: Response, next: (err?: Error) => void) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: `Le fichier est trop volumineux. Taille maximale: ${config.upload.maxFileSize / 1024 / 1024}MB`,
      });
      return;
    }
    
    res.status(400).json({
      success: false,
      message: `Erreur lors de l'upload: ${err.message}`,
    });
    return;
  }
  
  if (err) {
    logger.error('Upload error:', err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }
  
  next();
};

import { sequelize } from '../config/database';
import { logger } from './logger';
import { 
  User, 
  Role, 
  Permission, 
  Category, 
  Document, 
  DocumentVersion, 
  Tag, 
  AuditLog 
} from '../models';

/**
 * Utilitaire de migration pour Sequelize
 * Permet de créer les tables et synchroniser les modèles avec la base de données
 */
class MigrationUtil {
  /**
   * Exécute toutes les migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      logger.info('🚀 Début des migrations...');
      
      // Authentification à la base de données
      await sequelize.authenticate();
      logger.info('✅ Connexion à la base de données établie');

      // Synchronisation des modèles (création des tables)
      // L'option alter:true met à jour les tables existantes sans supprimer les données
      await sequelize.sync({ alter: true });
      logger.info('✅ Tables synchronisées avec succès');

      // Ajout des colonnes manquantes (updated_at, etc.)
      await this.addMissingColumns();

      // Vérification des tables créées
      await this.verifyTables();
      
      logger.info('✅ Migrations terminées avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors des migrations:', error);
      throw error;
    }
  }

  /**
   * Crée les tables sans modification (cold start)
   */
  static async createTables(): Promise<void> {
    try {
      logger.info('🚀 Création des tables...');
      
      await sequelize.authenticate();
      await sequelize.sync({ force: true });
      
      logger.info('✅ Tables créées avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la création des tables:', error);
      throw error;
    }
  }

  /**
   * Réinitialise la base de données (supprime et recrée)
   */
  static async resetDatabase(): Promise<void> {
    try {
      logger.warn('⚠️ Réinitialisation de la base de données...');
      
      await sequelize.authenticate();
      await sequelize.sync({ force: true });
      
      logger.info('✅ Base de données réinitialisée');
    } catch (error) {
      logger.error('❌ Erreur lors de la réinitialisation:', error);
      throw error;
    }
  }

  /**
   * Vérifie que toutes les tables existent
   */
  private static async verifyTables(): Promise<void> {
    const expectedTables = [
      'users',
      'roles',
      'permissions',
      'categories',
      'documents',
      'document_versions',
      'tags',
      'audit_logs'
    ];

    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    
    // Normaliser les noms de tables (minuscule pour MySQL)
    const normalizedTables = tables.map((t: string) => t.toLowerCase());
    
    logger.info(`📋 Tables existantes: ${normalizedTables.length}`);
    
    for (const table of expectedTables) {
      if (normalizedTables.includes(table.toLowerCase())) {
        logger.info(`  ✅ ${table}`);
      } else {
        logger.warn(`  ⚠️ ${table} - manquante`);
        // Créer la table si elle manque
        await this.createMissingTable(table);
      }
    }
  }

  /**
   * Crée une table manquante explicitement
   */
  private static async createMissingTable(tableName: string): Promise<void> {
    try {
      logger.info(`🔧 Création de la table manquante: ${tableName}...`);
      
      switch (tableName) {
        case 'audit_logs':
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT,
              action VARCHAR(50) NOT NULL,
              entity_type VARCHAR(50) NOT NULL,
              entity_id INT,
              old_values LONGTEXT,
              new_values LONGTEXT,
              ip_address VARCHAR(45),
              user_agent TEXT,
              description VARCHAR(500),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_user_id (user_id),
              INDEX idx_action (action),
              INDEX idx_entity (entity_type, entity_id),
              INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
          logger.info(`  ✅ Table ${tableName} créée avec succès`);
          break;
          
        default:
          logger.warn(`  ⚠️ Pas de méthode de création pour: ${tableName}`);
      }
    } catch (error) {
      logger.error(`  ❌ Erreur lors de la création de ${tableName}:`, error);
    }
  }

  /**
   * Ajoute les colonnes manquantes aux tables existantes
   */
  private static async addMissingColumns(): Promise<void> {
    try {
      logger.info('🔧 Vérification des colonnes manquantes...');
      
      // Vérifier et ajouter updated_at à permissions si absent
      await this.addColumnIfNotExists('permissions', 'updated_at', 
        'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      
      // Vérifier et ajouter updated_at à tags si absent
      await this.addColumnIfNotExists('tags', 'updated_at', 
        'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      
      // Vérifier et ajouter updated_at à audit_logs si absent
      await this.addColumnIfNotExists('audit_logs', 'updated_at', 
        'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      
      logger.info('  ✅ Colonnes vérifiées');
    } catch (error) {
      logger.error('  ❌ Erreur lors de la vérification des colonnes:', error);
    }
  }

  /**
   * Ajoute une colonne si elle n'existe pas
   */
  private static async addColumnIfNotExists(tableName: string, columnName: string, definition: string): Promise<void> {
    try {
      // Vérifier si la colonne existe
      const [columns]: any = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '${tableName}' 
        AND COLUMN_NAME = '${columnName}'
      `);
      
      if (columns[0].count === 0) {
        await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
        logger.info(`    ➕ Colonne ${columnName} ajoutée à ${tableName}`);
      }
    } catch (error) {
      logger.debug(`    Colonne ${columnName} existe déjà dans ${tableName}`);
    }
  }

  /**
   * Affiche le statut des migrations
   */
  static async status(): Promise<void> {
    try {
      await sequelize.authenticate();
      
      const queryInterface = sequelize.getQueryInterface();
      const tables = await queryInterface.showAllTables();
      
      logger.info('📊 Statut des tables:');
      for (const table of tables) {
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        const count = (countResult as any[])[0]?.count || 0;
        logger.info(`  - ${table}: ${count} enregistrements`);
      }
    } catch (error) {
      logger.error('❌ Erreur lors du statut:', error);
    }
  }
}

export default MigrationUtil;

// Exécution directe du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      switch (command) {
        case 'createTables':
          await MigrationUtil.createTables();
          break;
        case 'resetDatabase':
          await MigrationUtil.resetDatabase();
          break;
        case 'status':
          await MigrationUtil.status();
          break;
        default:
          await MigrationUtil.runMigrations();
      }
      process.exit(0);
    } catch (error) {
      console.error('Erreur:', error);
      process.exit(1);
    }
  })();
}

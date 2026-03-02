import { sequelize } from '../config/database';
import { logger } from './logger';
import { User, Role, Permission, Category, Tag, Document, AuditLog } from '../models';
import bcrypt from 'bcryptjs';

/**
 * Données de seed pour les rôles
 */
const rolesData = [
  { name: 'admin', description: 'Administrateur système - Accès complet' },
  { name: 'manager', description: 'Gestionnaire - Gestion des documents et utilisateurs' },
  { name: 'user', description: 'Utilisateur standard - Upload et consultation' },
  { name: 'guest', description: 'Invité - Lecture seule' }
];

/**
 * Données de seed pour les permissions
 */
const permissionsData = [
  // Utilisateurs
  { name: 'users:read', description: 'Voir la liste des utilisateurs' },
  { name: 'users:create', description: 'Créer des utilisateurs' },
  { name: 'users:update', description: 'Modifier des utilisateurs' },
  { name: 'users:delete', description: 'Supprimer des utilisateurs' },
  // Documents
  { name: 'documents:read', description: 'Lire les documents' },
  { name: 'documents:create', description: 'Créer des documents' },
  { name: 'documents:update', description: 'Modifier les documents' },
  { name: 'documents:delete', description: 'Supprimer des documents' },
  { name: 'documents:approve', description: 'Approuver les documents' },
  { name: 'documents:download', description: 'Télécharger les documents' },
  { name: 'documents:preview', description: 'Prévisualiser les documents' },
  // Catégories
  { name: 'categories:read', description: 'Voir les catégories' },
  { name: 'categories:create', description: 'Créer des catégories' },
  { name: 'categories:update', description: 'Modifier les catégories' },
  { name: 'categories:delete', description: 'Supprimer les catégories' },
  // Audit
  { name: 'audit:read', description: 'Voir les journaux d\'audit' },
  // Paramètres
  { name: 'settings:manage', description: 'Gérer les paramètres système' }
];

/**
 * Données de seed pour les catégories
 * Utilise parentName pour résoudre dynamiquement les parent_id
 */
interface CategorySeedData {
  name: string;
  parentName: string | null;
  description: string;
  path: string;
  is_system: boolean;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

const categoriesData: CategorySeedData[] = [
  // Catégorie racine
  { name: 'Documents', parentName: null, description: 'Catégorie racine', path: '/', is_system: true, icon: 'folder', color: '#0dcaf0', sort_order: 0 },
  
  // Documents Juridiques
  { name: 'Documents Juridiques', parentName: 'Documents', description: 'Tous les documents juridiques et légaux', path: '/1/', is_system: false, icon: 'gavel', color: '#dc3545', sort_order: 1 },
  { name: 'Contrats de travail', parentName: 'Documents Juridiques', description: 'Contrats CDI, CDD, Stage, Intérim', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 0 },
  { name: 'Contrats commerciaux', parentName: 'Documents Juridiques', description: 'Contrats de vente, prestations de services', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 1 },
  { name: 'Contrats de location', parentName: 'Documents Juridiques', description: 'Baux commerciaux, bailleurs, locataires', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 2 },
  { name: 'Actes authentiques', parentName: 'Documents Juridiques', description: 'Actes notariés, procurations', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 3 },
  { name: 'Jugements', parentName: 'Documents Juridiques', description: 'Décisions de justice, jugements', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 4 },
  { name: 'Conventions', parentName: 'Documents Juridiques', description: 'Accords, conventions collectives', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 5 },
  
  // Documents Comptables
  { name: 'Documents Comptables', parentName: 'Documents', description: 'Documents financiers et comptables', path: '/1/', is_system: false, icon: 'calculator', color: '#198754', sort_order: 2 },
  { name: 'Factures', parentName: 'Documents Comptables', description: 'Factures clients et fournisseurs', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 0 },
  { name: 'Devis', parentName: 'Documents Comptables', description: 'Devis et propositions commerciales', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 1 },
  { name: 'Notes de crédit', parentName: 'Documents Comptables', description: 'Avoirs et notes de crédit', path: '/1/', is_system: false, icon: 'file-text', color: null, sort_order: 2 },
  
  // Rapports
  { name: 'Rapports', parentName: 'Documents', description: 'Documents de travail et rapports', path: '/1/', is_system: false, icon: 'bar-chart', color: '#6f42c1', sort_order: 3 }
];

/**
 * Données de seed pour les tags
 */
const tagsData = [
  { name: 'Important', color: '#dc3545' },
  { name: 'Urgente', color: '#fd7e14' },
  { name: 'Confidentiel', color: '#6f42c1' },
  { name: 'Archivé', color: '#6c757d' },
  { name: 'En cours', color: '#0dcaf0' },
  { name: 'Terminé', color: '#198754' }
];

/**
 * Mapping des permissions par rôle
 */
const rolePermissions: Record<string, string[]> = {
  admin: [], // Toutes les permissions sauf documents:approve
  manager: [
    'users:read', 'documents:read', 'documents:create', 'documents:update',
    'documents:delete', 'documents:approve', 'documents:download', 'documents:preview',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'audit:read'
  ],
  user: [
    'documents:read', 'documents:create', 'documents:update', 'documents:download', 'documents:preview',
    'categories:read'
  ],
  guest: [
    'documents:read', 'documents:preview'
  ]
};

/**
 * Utilitaire de seeding pour Sequelize
 * Permet de populer la base de données avec des données initiales
 */
class SeederUtil {
  /**
   * Exécute tous les seeders
   */
  static async runSeeders(): Promise<void> {
    const transaction = await sequelize.transaction();
    
    try {
      logger.info('🚀 Début du seeding...');

      // Seed des rôles
      await this.seedRoles(transaction);
      
      // Seed des permissions
      const permissions = await this.seedPermissions(transaction);
      
      // Attribution des permissions aux rôles
      await this.seedRolePermissions(permissions, transaction);
      
      // Seed de l'utilisateur admin
      await this.seedAdminUser(transaction);
      
      // Seed des catégories
      await this.seedCategories(transaction);
      
      // Seed des tags
      await this.seedTags(transaction);

      await transaction.commit();
      logger.info('✅ Seeding terminé avec succès');
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Erreur lors du seeding:', error);
      throw error;
    }
  }

  /**
   * Seed les rôles
   */
  private static async seedRoles(transaction: any): Promise<void> {
    for (const roleData of rolesData) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData,
        transaction
      });
      
      if (created) {
        logger.info(`  ✅ Rôle créé: ${roleData.name}`);
      } else {
        logger.info(`  ⚠️ Rôle existant: ${roleData.name}`);
      }
    }
  }

  /**
   * Seed les permissions
   */
  private static async seedPermissions(transaction: any): Promise<Permission[]> {
    const permissions: Permission[] = [];
    
    for (const permData of permissionsData) {
      const [permission, created] = await Permission.findOrCreate({
        where: { name: permData.name },
        defaults: permData,
        transaction
      });
      
      permissions.push(permission);
      
      if (created) {
        logger.info(`  ✅ Permission créée: ${permData.name}`);
      }
    }
    
    return permissions;
  }

  /**
   * Attribution des permissions aux rôles via SQL direct
   */
  private static async seedRolePermissions(permissions: Permission[], transaction: any): Promise<void> {
    const adminRole = await Role.findOne({ where: { name: 'admin' }, transaction });
    const managerRole = await Role.findOne({ where: { name: 'manager' }, transaction });
    const userRole = await Role.findOne({ where: { name: 'user' }, transaction });
    const guestRole = await Role.findOne({ where: { name: 'guest' }, transaction });

    if (!adminRole || !managerRole || !userRole || !guestRole) {
      throw new Error('Rôles non trouvés');
    }

    // Admin: toutes les permissions sauf documents:approve
    const adminPerms = permissions.filter(p => p.name !== 'documents:approve');
    for (const perm of adminPerms) {
      await sequelize.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        { replacements: [adminRole.id, perm.id], transaction }
      );
    }

    // Manager
    const managerPerms = permissions.filter(p => rolePermissions.manager.includes(p.name));
    for (const perm of managerPerms) {
      await sequelize.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        { replacements: [managerRole.id, perm.id], transaction }
      );
    }

    // User
    const userPerms = permissions.filter(p => rolePermissions.user.includes(p.name));
    for (const perm of userPerms) {
      await sequelize.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        { replacements: [userRole.id, perm.id], transaction }
      );
    }

    // Guest
    const guestPerms = permissions.filter(p => rolePermissions.guest.includes(p.name));
    for (const perm of guestPerms) {
      await sequelize.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        { replacements: [guestRole.id, perm.id], transaction }
      );
    }

    logger.info('  ✅ Permissions attribuées aux rôles');
  }

  /**
   * Seed l'utilisateur admin par défaut
   */
  private static async seedAdminUser(transaction: any): Promise<void> {
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    
    if (!adminRole) {
      throw new Error('Rôle admin non trouvé');
    }

    // Password hash pour "Admin123!" avec bcrypt
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    const [adminUser, created] = await User.findOrCreate({
      where: { email: 'admin@ged.com' },
      defaults: {
        email: 'admin@ged.com',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'Système',
        role_id: adminRole.id,
        is_active: true,
        email_verified: true
      },
      transaction
    });

    if (created) {
      logger.info(`  ✅ Utilisateur admin créé: admin@ged.com`);
    } else {
      logger.info(`  ⚠️ Utilisateur admin existant: admin@ged.com`);
    }
  }

  /**
   * Seed les catégories
   * Résout dynamiquement les parentName en parent_id
   */
  private static async seedCategories(transaction: any): Promise<void> {
    // Récupérer l'utilisateur admin existant
    const adminUser = await User.findOne({ where: { email: 'admin@ged.com' }, transaction });
    
    if (!adminUser) {
      logger.warn('  ⚠️ Utilisateur admin non trouvé, les catégories seront créées sans created_by');
    }

    // Créer d'abord toutes les catégories sans parent_id
    const categoryMap = new Map<string, any>();
    
    for (const catData of categoriesData) {
      const [category, created] = await Category.findOrCreate({
        where: { name: catData.name },
        defaults: {
          name: catData.name,
          parent_id: null,
          description: catData.description,
          path: catData.path,
          icon: catData.icon || null,
          color: catData.color || null,
          sort_order: catData.sort_order || 0,
          created_by: adminUser?.id || 1,
          is_system: catData.is_system || false
        },
        transaction
      });
      
      categoryMap.set(catData.name, category);
      
      if (created) {
        logger.info(`  ✅ Catégorie créée: ${catData.name}`);
      }
    }
    
    // Mettre à jour les parent_id après la création de toutes les catégories
    for (const catData of categoriesData) {
      if (catData.parentName) {
        const parentCategory = categoryMap.get(catData.parentName);
        const childCategory = categoryMap.get(catData.name);
        
        if (parentCategory && childCategory && childCategory.parent_id === null) {
          await Category.update(
            { 
              parent_id: parentCategory.id,
              path: `${parentCategory.path}${parentCategory.id}/`
            },
            { where: { id: childCategory.id }, transaction }
          );
        }
      }
    }
    
    logger.info('  ✅ Catégories organisées en arborescence');
  }

  /**
   * Seed les tags
   */
  private static async seedTags(transaction: any): Promise<void> {
    for (const tagData of tagsData) {
      const [tag, created] = await Tag.findOrCreate({
        where: { name: tagData.name },
        defaults: tagData,
        transaction
      });
      
      if (created) {
        logger.info(`  ✅ Tag créé: ${tagData.name}`);
      }
    }
  }

  /**
   * Vide toutes les données (sauf structure)
   */
  static async truncate(): Promise<void> {
    const transaction = await sequelize.transaction();
    
    try {
      logger.warn('⚠️ Suppression des données...');
      
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
      
      await Document.destroy({ where: {}, transaction });
      await Tag.destroy({ where: {}, transaction });
      await Category.destroy({ where: {}, transaction });
      await User.destroy({ where: {}, transaction });
      await Permission.destroy({ where: {}, transaction });
      await Role.destroy({ where: {}, transaction });
      await AuditLog.destroy({ where: {}, transaction });
      
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      
      await transaction.commit();
      logger.info('✅ Données supprimées');
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ Erreur lors de la suppression:', error);
      throw error;
    }
  }

  /**
   * Affiche le statut des données
   */
  static async status(): Promise<void> {
    try {
      await sequelize.authenticate();
      
      const counts = {
        users: await User.count(),
        roles: await Role.count(),
        permissions: await Permission.count(),
        categories: await Category.count(),
        documents: await Document.count(),
        tags: await Tag.count(),
        auditLogs: await AuditLog.count()
      };

      logger.info('📊 Statut des données seeded:');
      for (const [key, count] of Object.entries(counts)) {
        logger.info(`  - ${key}: ${count}`);
      }
    } catch (error) {
      logger.error('❌ Erreur lors du statut:', error);
    }
  }
}

export default SeederUtil;

// Exécution directe du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    try {
      switch (command) {
        case 'truncate':
          await SeederUtil.truncate();
          break;
        case 'status':
          await SeederUtil.status();
          break;
        default:
          await SeederUtil.runSeeders();
      }
      process.exit(0);
    } catch (error) {
      console.error('Erreur:', error);
      process.exit(1);
    }
  })();
}

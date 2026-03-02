-- =====================================================
-- GESTION ÉLECTRONIQUE DE DOCUMENTS (GED) - SCHÉMA SQL
-- Base de données: MySQL
-- =====================================================

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS ged_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE ged_db;

-- =====================================================
-- TABLE: ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: PERMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: ROLE_PERMISSIONS (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar VARCHAR(500),
    role_id INT NOT NULL DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_email (email),
    INDEX idx_role (role_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    parent_id INT NULL,
    description TEXT,
    path VARCHAR(500) DEFAULT '/',
    icon VARCHAR(50),
    color VARCHAR(7),
    sort_order INT DEFAULT 0,
    created_by INT NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_parent (parent_id),
    INDEX idx_path (path(255)),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    extension VARCHAR(20) NOT NULL,
    size BIGINT NOT NULL,
    path VARCHAR(500) NOT NULL,
    checksum VARCHAR(64),
    category_id INT,
    uploaded_by INT NOT NULL,
    status ENUM('draft', 'pending', 'approved', 'rejected', 'archived') DEFAULT 'draft',
    is_archived BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    ocr_text TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_category (category_id),
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_status (status),
    INDEX idx_archived (is_archived),
    INDEX idx_deleted (is_deleted),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: DOCUMENT_VERSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    path VARCHAR(500) NOT NULL,
    change_description VARCHAR(500),
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_document (document_id),
    INDEX idx_version (version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: TAGS
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6c757d',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: DOCUMENT_TAGS (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_tags (
    document_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (document_id, tag_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: DOCUMENT_METADATA
-- =====================================================
CREATE TABLE IF NOT EXISTS document_metadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    key_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE KEY uk_document_key (document_id, key_name),
    INDEX idx_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: AUDIT_LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: WORKFLOW_INSTANCES
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_instances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    workflow_type ENUM('approval', 'review', 'signature') DEFAULT 'approval',
    status ENUM('pending', 'in_progress', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    initiated_by INT NOT NULL,
    current_approver_id INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    rejection_reason VARCHAR(500),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (initiated_by) REFERENCES users(id),
    FOREIGN KEY (current_approver_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_document (document_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: WORKFLOW_HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workflow_instance_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_workflow (workflow_instance_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DONNÉES INITIALES (SEED)
-- =====================================================

-- Rôles
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrateur système - Accès complet'),
('manager', 'Gestionnaire - Gestion des documents et utilisateurs'),
('user', 'Utilisateur standard - Upload et consultation'),
('guest', 'Invité - Lecture seule');

-- Permissions
INSERT INTO permissions (name, description) VALUES 
-- Utilisateurs
('users:read', 'Voir la liste des utilisateurs'),
('users:create', 'Créer des utilisateurs'),
('users:update', 'Modifier des utilisateurs'),
('users:delete', 'Supprimer des utilisateurs'),
-- Documents
('documents:read', 'Lire les documents'),
('documents:create', 'Créer des documents'),
('documents:update', 'Modifier les documents'),
('documents:delete', 'Supprimer des documents'),
('documents:approve', 'Approuver les documents'),
('documents:download', 'Télécharger les documents'),
('documents:preview', 'Prévisualiser les documents'),
-- Catégories
('categories:read', 'Voir les catégories'),
('categories:create', 'Créer des catégories'),
('categories:update', 'Modifier les catégories'),
('categories:delete', 'Supprimer des catégories'),
-- Audit
('audit:read', 'Voir les journaux d''audit'),
-- Paramètres
('settings:manage', 'Gérer les paramètres système');

-- Attribution des permissions aux rôles
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE name != 'documents:approve'
UNION ALL
SELECT 2, id FROM permissions WHERE name IN (
    'users:read', 'documents:read', 'documents:create', 'documents:update', 
    'documents:delete', 'documents:approve', 'documents:download', 'documents:preview',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'audit:read'
)
UNION ALL
SELECT 3, id FROM permissions WHERE name IN (
    'documents:read', 'documents:create', 'documents:update', 'documents:download', 'documents:preview',
    'categories:read'
)
UNION ALL
SELECT 4, id FROM permissions WHERE name IN (
    'documents:read', 'documents:preview'
);

-- Utilisateur admin par défaut (password: Admin123!)
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active, email_verified) VALUES 
('admin@ged.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.z7NQeG', 'Admin', 'Système', 1, TRUE, TRUE);

-- Catégorie racine par défaut
INSERT INTO categories (name, parent_id, description, path, created_by, is_system) VALUES
('Documents', NULL, 'Catégorie racine', '/', 1, TRUE),
('Factures', 1, 'Documents comptables', '/1/', 1, FALSE),
('Contrats', 1, 'Documents juridiques', '/1/', 1, FALSE),
('Rapports', 1, 'Documents de travail', '/1/', 1, FALSE);

-- Tags par défaut
INSERT INTO tags (name, color) VALUES 
('Important', '#dc3545'),
('Urgente', '#fd7e14'),
('Confidentiel', '#6f42c1'),
('Archivé', '#6c757d'),
('En cours', '#0dcaf0'),
('Terminé', '#198754');

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

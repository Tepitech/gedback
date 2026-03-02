import { Sequelize } from 'sequelize';
import { config } from './env';
import { logger } from '../utils/logger';

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à la base de données établie');

    if (config.env === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Modèles synchronisés avec la base de données');
    }
  } catch (error) {
    logger.error('❌ Impossible de se connecter à la base de données:', error);
    process.exit(1);
  }
};

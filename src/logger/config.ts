import { Configuration } from 'log4js';

const level = process.env.KEXPRESS_SEQUELIZE_LOGGER_LEVEL;

export const configuration: Configuration = {
  appenders: {
    console: {
      type: 'console',
    },
  },
  categories: {
    'default': {
      appenders: [
        'console',
      ],
      level: level ? level : 'info',
    },
    'kexpress-sequelize': {
      appenders: [
        'console',
      ],
      level: level ? level : 'info',
    },
  },
};

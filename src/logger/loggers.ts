import { configure, getLogger } from 'log4js';
import { configuration } from './config';

configure(configuration);

export const logger = getLogger('kexpress-sequelize');

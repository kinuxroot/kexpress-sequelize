import * as glob from 'glob';
import * as _ from 'lodash';
import * as path from 'path';
import * as util from 'util';

import { Model, ModelCtor, ModelOptions, Sequelize } from 'sequelize';

import { logger } from './logger/loggers';
import {
  AssociateFunctionSymbol,
  AssociationsSymbol,
  ColumnsSymbol,
  ConnectionSymbol,
  ModelSymbol,
} from './symbols';
import {
  IColumnDefinitions,
  ISequelizeConnectionOptionsSet,
  SequelizeConnectionOptions,
} from './types';

let DefaultConnection: Connection = null;
const ExistedConnections: Map<string, Connection> = new Map();

const globAsync = util.promisify(glob);

const LoggerModulePath = 'connection.Connection';

export class Connection {
  public readonly sequelize: Sequelize;
  private originalModels: Map<string, ModelCtor<Model>> = new Map();
  private models: Map<string, ModelCtor<Model>> = new Map();

  public constructor(options: SequelizeConnectionOptions) {
    this.sequelize = new Sequelize(options);

    if (!DefaultConnection) {
      DefaultConnection = this;
    }
  }

  public async importModule(moduleFilePath: string) {
    logger.debug(`[KEXPRESS-SEQUELIZE] <${LoggerModulePath}> - Import module: ${moduleFilePath}`);
    const module = await import(moduleFilePath);

    Object.entries(module).forEach(([modelName, model]) => {
      if (model[ModelSymbol]) {
        logger.debug(`[KEXPRESS-SEQUELIZE] <${LoggerModulePath}> - Found model: ${modelName}`);

        this.originalModels.set(modelName, (model as unknown) as ModelCtor<
          any
        >);
      }
    });
  }

  public initializeModels() {
    // Initialize the models
    for (const [key, model] of this.originalModels.entries()) {
      const initedModel = class extends model {
        public static [ModelSymbol] = model[ModelSymbol];
        public static [AssociateFunctionSymbol] =
          model[AssociateFunctionSymbol];
      };
      initedModel.prototype[AssociationsSymbol] =
        model.prototype[AssociationsSymbol];

      const columns: IColumnDefinitions = model.prototype[ColumnsSymbol];
      const modelOptions = model[ModelSymbol];

      const finalModelOptions = {
        sequelize: this.sequelize,
      };
      Object.assign(finalModelOptions, modelOptions);

      initedModel.init(columns, finalModelOptions);
      this.models.set(key, initedModel);
    }

    // Initialzie the associations
    Array.from(this.models.values()).forEach(model => {
      model[AssociateFunctionSymbol](model, this.models);
    });
  }

  public getModel<T>(modelName: string) {
    return (this.models.get(modelName) as unknown) as T;
  }
}

export async function createConnection(options: SequelizeConnectionOptions) {
  const connection = new Connection(options);

  const { entities } = options;
  for (const entityFilePath of entities) {
    const normalizedPath = path.normalize(entityFilePath);
    const matchFilePaths = await globAsync(normalizedPath);

    for (const matchFilePath of matchFilePaths) {
      await connection.importModule(matchFilePath);
    }
  }

  connection.initializeModels();

  return connection;
}

export async function createConnections(
  optionsSet: ISequelizeConnectionOptionsSet,
): Promise<{ [connectioName: string]: Connection }> {
  const createConnectionTasks = Object.entries(optionsSet).map(
    async ([connectionName, connectionOptions]) => {
      const connection = await createConnection(connectionOptions);

      return {
        name: connectionName,
        connection,
      };
    },
  );

  const createdConnections = await Promise.all(createConnectionTasks);
  createdConnections.forEach(({ name, connection }) => {
    if (ExistedConnections.has(name)) {
      throw new Error(`The connection named ${name} is existed`);
    }

    ExistedConnections.set(name, connection);
  });

  return _.fromPairs(
    createdConnections.map(({ name, connection }) => [name, connection]),
  );
}

export function getConnection(connectionName?: string): Connection {
  if (connectionName) {
    return ExistedConnections.get(connectionName);
  }

  return DefaultConnection;
}

export type UseConnectionOption = string | Connection;

interface IUsedConnections {
  onClass: UseConnectionOption;
  onProperties: {
    [x: string]: UseConnectionOption;
  };
}

export function UseConnection(connectionOption: string | Connection) {
  function getUsedConnections(prototype: any): IUsedConnections {
    return (
      prototype[ConnectionSymbol] || {
        onClass: null,
        onProperties: {},
      }
    );
  }

  function useConnectionOnClass(target: any) {
    const usedConnections = getUsedConnections(target.prototype);
    usedConnections.onClass = connectionOption;

    target.prototype[ConnectionSymbol] = usedConnections;
  }

  function useConnectionOnProperty(target: any, propertyKey: string) {
    const usedConnections = getUsedConnections(target);
    usedConnections.onProperties[propertyKey] = connectionOption;

    target[ConnectionSymbol] = usedConnections;
  }

  return (target: any, propertyKey?: string) => {
    if (propertyKey) {
      useConnectionOnProperty(target, propertyKey);
    } else {
      useConnectionOnClass(target);
    }
  };
}

export function RawConnection() {
  function getUsedConnection(prototype: any, propertyKey: string): Connection {
    const usedConnections: IUsedConnections = prototype[ConnectionSymbol];
    if (!usedConnections) {
      if (!DefaultConnection) {
        throw new Error('No default connection in typed sequelize');
      }

      return DefaultConnection;
    }

    const usedConnection =
      usedConnections.onProperties[propertyKey] || usedConnections.onClass;

    if (!usedConnection) {
      logger.warn(
        `Connection on ${propertyKey} is not found, use default connection`,
      );

      if (!DefaultConnection) {
        throw new Error('No default connection in typed sequelize');
      }

      return DefaultConnection;
    }

    if (typeof usedConnection === 'string') {
      return getConnection(usedConnection);
    }

    return usedConnection;
  }

  let cachedConnection: Connection = null;
  return (target: any, propertyKey: string) => {
    Object.defineProperty(target, propertyKey, {
      get() {
        if (!cachedConnection) {
          cachedConnection = getUsedConnection(target, propertyKey);
        }

        return cachedConnection.sequelize;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

export function UseEntity(modelCtor: ModelCtor<any>) {
  const modelOptions: ModelOptions = modelCtor[ModelSymbol];
  if (!modelOptions) {
    throw new Error('UseModel must be used on en Entity');
  }

  const { modelName } = modelOptions;

  function getUsedConnection(prototype: any, propertyKey: string): Connection {
    const usedConnections: IUsedConnections = prototype[ConnectionSymbol];
    if (!usedConnections) {
      if (!DefaultConnection) {
        throw new Error('No default connection in typed sequelize');
      }

      return DefaultConnection;
    }

    const usedConnection =
      usedConnections.onProperties[propertyKey] || usedConnections.onClass;

    if (!usedConnection) {
      logger.warn(
        `Connection on ${propertyKey} is not found, use default connection`,
      );

      if (!DefaultConnection) {
        throw new Error('No default connection in typed sequelize');
      }

      return DefaultConnection;
    }

    if (typeof usedConnection === 'string') {
      return getConnection(usedConnection);
    }

    return usedConnection;
  }

  let cachedConnection: Connection = null;
  return (target: any, propertyKey: string) => {
    Object.defineProperty(target, propertyKey, {
      get() {
        if (!cachedConnection) {
          cachedConnection = getUsedConnection(target, propertyKey);
        }

        return cachedConnection.getModel<typeof modelCtor>(modelName);
      },
      enumerable: true,
      configurable: true,
    });
  };
}

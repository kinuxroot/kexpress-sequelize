import {
  BuildOptions,
  DataType,
  ModelAttributeColumnOptions,
  ModelCtor,
  Options as SequelizeOptions,
} from 'sequelize';

export enum AssociationType {
  HasMany = 'hasMany',
  HasOne = 'hasOne',
  BelongsTo = 'belongsTo',
  BelongsToMany = 'belongsToMany',
}

export interface IAssociationDefinition<OptionsType> {
  type: AssociationType;
  source?: ModelCtor<any>;
  target: () => ModelCtor<any>;
  options?: OptionsType;
}

export type ColumnDefinition = DataType | ModelAttributeColumnOptions;

export interface IColumnDefinitions {
  [columnName: string]: ColumnDefinition;
}

export type SequelizeConnectionOptions = SequelizeOptions & {
  /**
   * The path of all entities
   *
   * @type {string[]}
   */
  entities: string[],
};

export interface ISequelizeConnectionOptionsSet {
  [connectionName: string]: SequelizeConnectionOptions;
}

export interface IModelCreationOptions extends BuildOptions {
  raw?: boolean;
  isNewRecord?: boolean;
}

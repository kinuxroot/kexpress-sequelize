import * as _ from 'lodash';
import {
  AssociationOptions,
  BelongsToManyOptions,
  BelongsToOptions,
  HasManyOptions,
  HasOneOptions,
  Model,
  ModelCtor,
  ModelOptions,
} from 'sequelize';
import {
  AssociateFunctionSymbol,
  AssociationsSymbol,
  ModelSymbol,
} from './symbols';
import { AssociationType, IAssociationDefinition } from './types';

export function Entity(modelOptions?: ModelOptions | string) {
  return <T extends Model>(modelType: ModelCtor<T>) => {
    const defaultModelOptions = {
      modelName: modelType.name,
    };

    if (!modelOptions) {
      modelOptions = modelType.name;
    }

    const finalModelOptions: ModelOptions = {};
    if (typeof modelOptions === 'string') {
      finalModelOptions.modelName = modelOptions;

      _.defaults(finalModelOptions, defaultModelOptions);
    } else {
      Object.assign(finalModelOptions, modelOptions);

      _.defaults(finalModelOptions, defaultModelOptions);
    }

    const associationsFunction = <S extends Model>(
      sourceType: ModelCtor<S>,
      entities: Map<string, ModelCtor<Model>>
    ) => {
      const associations: Array<IAssociationDefinition<AssociationOptions>> =
        sourceType.prototype[AssociationsSymbol];

      if (!associations) {
        return;
      }

      associations.forEach((association) => {
        const originalTargetType = association.target();
        const targetTypeModelName = originalTargetType[ModelSymbol].modelName;

        // 根据目标模型名称查找目前连接中已经初始化的目标类型
        const targetTypeEntry = entities.get(targetTypeModelName);

        if (!targetTypeEntry) {
          throw new Error(
            `The target name: ${targetTypeModelName} is not found in current connection`
          );
        }

        const targetType = targetTypeEntry;

        if (association.type === AssociationType.HasMany) {
          sourceType.hasMany(targetType, association.options as HasManyOptions);
        } else if (association.type === AssociationType.BelongsTo) {
          sourceType.belongsTo(
            targetType,
            association.options as BelongsToOptions
          );
        } else if (association.type === AssociationType.HasOne) {
          sourceType.hasOne(targetType, association.options as HasOneOptions);
        } else if (association.type === AssociationType.BelongsToMany) {
          sourceType.belongsToMany(
            targetType,
            association.options as BelongsToManyOptions
          );
        } else {
          throw new Error(`Association type ${association.type} is not found`);
        }
      });
    };

    modelType[ModelSymbol] = finalModelOptions;
    modelType[AssociateFunctionSymbol] = associationsFunction;
  };
}

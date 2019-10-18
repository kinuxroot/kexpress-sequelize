import * as _ from 'lodash';
import { HasManyOptions, Model, ModelCtor } from 'sequelize';
import { AssociationsSymbol } from '../symbols';
import { AssociationType, IAssociationDefinition } from '../types';

export function HasMany<T extends Model>(
    target: () => ModelCtor<T>, options?: HasManyOptions) {
  return (prototype: any, propertyKey: string) => {
    const finalOptions = _.clone(options);
    _.defaults(finalOptions, {
      as: propertyKey,
    });

    if (!prototype[AssociationsSymbol]) {
      prototype[AssociationsSymbol] = [];
    }

    const association: IAssociationDefinition<HasManyOptions> = {
      type: AssociationType.HasMany,
      target,
      options: finalOptions,
    };

    prototype[AssociationsSymbol].push(association);
  };
}

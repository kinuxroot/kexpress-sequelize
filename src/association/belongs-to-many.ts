import * as _ from 'lodash';
import { BelongsToManyOptions, Model, ModelCtor } from 'sequelize';
import { AssociationsSymbol } from '../symbols';
import { AssociationType, IAssociationDefinition } from '../types';

export function BelongsToMany<T extends Model>(
    target: () => ModelCtor<T>, options?: BelongsToManyOptions) {
  return (prototype: any, propertyKey: string) => {
    const finalOptions = _.clone(options);
    _.defaults(finalOptions, {
      as: propertyKey,
    });

    if (!prototype[AssociationsSymbol]) {
      prototype[AssociationsSymbol] = [];
    }

    const association: IAssociationDefinition<BelongsToManyOptions> = {
      type: AssociationType.BelongsToMany,
      target,
      options: finalOptions,
    };

    prototype[AssociationsSymbol].push(association);
  };
}

import * as _ from 'lodash';
import { BelongsToOptions, Model, ModelCtor } from 'sequelize';
import { AssociationsSymbol } from '../symbols';
import { AssociationType, IAssociationDefinition } from '../types';

export function BelongsTo<T extends Model>(
    target: () => ModelCtor<T>, options?: BelongsToOptions) {
  return (prototype: any, propertyKey: string) => {
    const finalOptions = _.clone(options);
    _.defaults(finalOptions, {
      as: propertyKey,
    });

    if (!prototype[AssociationsSymbol]) {
      prototype[AssociationsSymbol] = [];
    }

    const association: IAssociationDefinition<BelongsToOptions> = {
      type: AssociationType.BelongsTo,
      target,
      options: finalOptions,
    };

    prototype[AssociationsSymbol].push(association);
  };
}

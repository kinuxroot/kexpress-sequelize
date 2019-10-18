import * as _ from 'lodash';
import { HasOneOptions, Model, ModelCtor } from 'sequelize';
import { AssociationsSymbol } from '../symbols';
import { AssociationType, IAssociationDefinition } from '../types';

export function HasOne<T extends Model>(
    target: () => ModelCtor<T>, options?: HasOneOptions) {
  return (prototype: any, propertyKey: string) => {
    const finalOptions = _.clone(options);
    _.defaults(finalOptions, {
      as: propertyKey,
    });

    if (!prototype[AssociationsSymbol]) {
      prototype[AssociationsSymbol] = [];
    }

    const association: IAssociationDefinition<HasOneOptions> = {
      type: AssociationType.HasOne,
      target,
      options: finalOptions,
    };

    prototype[AssociationsSymbol].push(association);
  };
}

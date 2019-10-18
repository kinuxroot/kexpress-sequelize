import { ColumnsSymbol } from './symbols';
import { ColumnDefinition } from './types';

export function Column(column: ColumnDefinition) {
  return (prototype: any, propertyKey: string) => {
    if (!prototype[ColumnsSymbol]) {
      prototype[ColumnsSymbol] = {};
    }

    const attributeName = propertyKey;
    prototype[ColumnsSymbol][attributeName] = column;
  };
}

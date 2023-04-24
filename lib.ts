import { Document, Filter } from 'mongodb';

const lib = {
  isString: (value: unknown) => value?.constructor.name === 'String',

  isArray: (arg: unknown) => arg?.constructor.name === 'Array',

  isObject: (arg: unknown) => arg?.constructor.name === 'Object',

  createRegExp: (value: string) => {
    if (value.charAt(0) !== '/' || value.charAt(value.length - 1) !== '/') {
      return value;
    }
    const text = value
      .substring(1, value.length - 1)
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    return new RegExp(text, 'i');
  },

  resolveArray: function (arr: Array<unknown>) {
    arr.forEach((item, index) => {
      if (this.isObject(item)) {
        arr[index] = this.parseFilter(item as Record<string, unknown>);
      } else if (this.isArray(item)) {
        arr[index] = this.resolveArray(item as Array<unknown>);
      } else if (this.isString(item)) {
        arr[index] = this.createRegExp(item as string);
      }
    });
    return arr;
  },

  parseFilter: function (filterObj: Record<string, unknown>) {
    Object.entries(filterObj).forEach(([key, value]) => {
      if (this.isString(value)) {
        filterObj[key] = this.createRegExp(value as string);
      } else if (this.isArray(value)) {
        filterObj[key] = this.resolveArray(value as Array<unknown>);
      } else if (this.isObject(value)) {
        filterObj[key] = this.parseFilter(value as Record<string, unknown>);
      }
    });
    return filterObj;
  },

  getFilter: function (
    _default: Filter<Document> | undefined,
    _filter: string | Filter<Document> | undefined
  ): Filter<Document> {
    const defaultFilter = _default ?? {};
    let filter = _filter ?? {};
    if (typeof filter === 'string') {
      try {
        filter = JSON.parse(filter);
        filter = this.parseFilter(filter as Record<string, unknown>);
      } catch (err) {
        filter = {};
      }
    }
    return { ...defaultFilter, ...filter };
  },

  getObject: <T = Record<string, unknown>>(_data: string | T) => {
    let data = _data ?? {};
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (err) {
        data = {};
      }
    }
    return data as T;
  },

  extractErrorMessage: (err: unknown) => {
    let message = err as string;
    if (err instanceof Error) {
      message = err.message;
    }
    return message;
  },
};

export default lib;
module.exports = lib;

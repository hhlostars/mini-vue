import { isString } from './utils'

// 是整数的key
export const isIntegerKey = (key: unknown): boolean =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key

// 是纯对象
export const isPlainObject = (val: unknown): val is object =>
  Object.prototype.toString.call(val) === '[object Object]'

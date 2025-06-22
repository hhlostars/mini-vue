import { isObject } from '@vue/shared'
import { ReactiveFlags } from './constants'
import { mutableHandlers } from './baseHandlers'

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
}

// 存放已经转换成 reactive 的对象
export const reactiveMap: WeakMap<Target, any> = new WeakMap<Target, any>()

function createReactiveObject(target: Target, baseHandlers, proxyMap) {
  if (!isObject(target)) {
    return target
  }
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy)
  return proxy
}

export function reactive(target: object) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}

export function toReactive(value: any) {
  if (isObject(value)) {
    return reactive(value)
  }
  return value
}

export function isReactive(value: unknown) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

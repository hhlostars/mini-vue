import { isArray, isFunction, isObject, isPlainObject } from '@vue/shared'
import { isRef } from './ref'
import { ReactiveEffect } from './effect'
import { isReactive } from './reactive'

export interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
}

export function watch(source, cb, options: WatchOptions = {}) {
  const { immediate, deep, once } = options
  const reactiveGetter = (source: object) => {
    if (deep) return source
    if (deep === false || deep === 0) {
      return traverse(source, 1)
    }
    return traverse(source)
  }

  let effect: ReactiveEffect
  let getter: () => any

  let cleanup: (() => void) | undefined
  function onCleanup(cb) {
    cleanup = cb
  }

  if (isRef(source)) {
    // 暂时做第一层的监听
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source)
  } else if (isFunction(source)) {
    getter = source
  }

  // deep不为0 则traverser
  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  const watchHandle = () => {
    effect.stop()
  }

  if (once && cb) {
    const _cb = cb
    cb = (...args) => {
      _cb(...args)
      watchHandle()
    }
  }

  let oldValue: any

  function job() {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    const newValue = effect.run()
    cb(newValue, oldValue, onCleanup)
    oldValue = newValue
  }

  effect = new ReactiveEffect(getter)
  effect.scheduler = job

  if (immediate) {
    job()
  } else {
    oldValue = effect.run()
  }

  return watchHandle
}

function traverse(
  value: unknown,
  depth: number = Infinity,
  seen?: Set<unknown>,
): unknown {
  if (depth <= 0 || !isObject(value)) {
    return value
  }
  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  depth--
  if (isRef(value)) {
    traverse(value.value, depth, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen)
    }
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen)
    }
  }
  return value
}

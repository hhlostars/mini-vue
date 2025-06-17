import { reactive, Target } from './reactive'
import { ReactiveFlags, TriggerOpTypes } from './constants'
import {
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
} from '@vue/shared'
import { isRef } from './ref'
import { track, trigger } from './dep'

class MutableReactiveHandler {
  constructor() {}
  get(target: Target, key: string | symbol, receiver: object): any {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    track(target, key)
    const res = Reflect.get(target, key, receiver)
    if (isRef(res)) {
      return res.value
    }

    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }

  set(
    target: any,
    key: string | symbol,
    value: any,
    receiver: object,
  ): boolean {
    let oldValue = target[key]
    /**
     * const a = ref(0)
     * const state = reactive({a})
     * state.a = 1
     */
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    }
    // 判断key是否存在 不存在是新增 存在是修改
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return result
  }
}

export const mutableHandlers: ProxyHandler<object> =
  new MutableReactiveHandler()

import { ReactiveFlags } from './constants'
import { Dependency, link, Link, propagate } from './system'
import { hasChanged } from '@vue/shared'
import { activeSub } from './effect'
import { toReactive } from './reactive'

class RefImpl<T = any> implements Dependency {
  _value: T
  subs: Link | undefined = undefined
  subsTail: Link | undefined = undefined
  constructor(value: T, isShallow: boolean) {
    this._value = isShallow ? value : toReactive(value)
    this[ReactiveFlags.IS_REF] = true
  }

  // 用dep指向自身
  get dep() {
    return this
  }

  get value() {
    trackRef(this)
    return this._value
  }

  set value(newValue) {
    if (hasChanged(this._value, newValue)) {
      this._value = newValue
      triggerRef(this)
    }
  }
}

export function isRef(value: any) {
  return value && value[ReactiveFlags.IS_REF]
}

function trackRef(dep: Dependency) {
  if (activeSub !== undefined) {
    link(dep, activeSub)
  }
}

function triggerRef(ref: RefImpl) {
  const dep = ref.dep
  if (dep !== undefined && dep.subs !== undefined) {
    propagate(dep.subs)
  }
}

function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

export function ref(value?: unknown) {
  return createRef(value, false)
}

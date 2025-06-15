import { ReactiveFlags } from './constants'
import { Dependency, link, Link, propagate } from './system'
import { hasChanged } from '@vue/shared'
import { activeSub } from './effect'

class RefImpl<T = any> implements Dependency {
  _value: T
  subs: Link | undefined = undefined
  subsTail: Link | undefined = undefined
  constructor(value: T) {
    this._value = value
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

function isRef(value: any) {
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

function createRef(value) {
  if (isRef(value)) {
    return value
  } else {
    return new RefImpl(value)
  }
}

export function ref(value) {
  return createRef(value)
}

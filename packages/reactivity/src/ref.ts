import { ReactiveFlags } from './constants'
import { Dependency, link, Link, propagate } from './system'
import { hasChanged, isArray, isObject } from '@vue/shared'
import { activeSub } from './effect'
import { toReactive } from './reactive'

export interface Ref<T = any, S = T> {
  get value(): T
  set value(_: S)
}

class RefImpl<T = any> implements Dependency {
  _value: T
  subs: Link | undefined = undefined
  subsTail: Link | undefined = undefined

  public readonly [ReactiveFlags.IS_REF] = true

  constructor(value: T, isShallow: boolean) {
    this._value = isShallow ? value : toReactive(value)
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

class ObjectRefImpl {
  public readonly [ReactiveFlags.IS_REF] = true
  constructor(
    private readonly _object,
    private readonly _key,
  ) {}
  get value() {
    return this._object[this._key]
  }
  set value(newVal) {
    this._object[this._key] = newVal
  }
}

export function isRef(value: any): value is Ref {
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

export function toRef(source: any, key?: string) {
  if (isRef(source)) {
    return source
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key)
  } else {
    return ref(source)
  }
}

function propertyToRef(source: any, key: string) {
  // 将对象的属性转换成ref
  const val = source[key]
  return isRef(val) ? val : new ObjectRefImpl(source, key)
}

export function toRefs(object: object) {
  const ret = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}

export function unref(ref) {
  return isRef(ref) ? ref.value : ref
}

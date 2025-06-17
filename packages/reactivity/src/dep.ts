import { Dependency, link, Link, propagate } from './system'
import { activeSub } from './effect'
import { isArray, isIntegerKey } from '@vue/shared'
import { TriggerOpTypes } from './constants'

export const targetMap = new WeakMap()

class Dep implements Dependency {
  _subs: Link | undefined = undefined
  subsTail: Link | undefined = undefined
  constructor(
    private map: any,
    private key: unknown,
  ) {}
  get subs(): Link | undefined {
    return this._subs
  }
  set subs(value: Link | undefined) {
    this._subs = value
    if (value === undefined) {
      this.map.delete(this.key)
    }
  }
}

export function track(target: object, key) {
  if (activeSub !== undefined) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = new Dep(depsMap, key)))
    }
    link(dep, activeSub)
  }
}

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldvalue?: unknown,
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 没有被收集
    return
  }
  const run = (dep: Dependency | undefined) => {
    if (dep !== undefined && dep.subs !== undefined) {
      propagate(dep.subs)
    }
  }
  const targetIsArray = isArray(target)
  const isArrayIndex = targetIsArray && isIntegerKey(key)

  if (targetIsArray && key === 'length') {
    // 直接改变数组的length 需要对不用收集的下标全部触发一遍
    const newLength = Number(newValue)
    depsMap.forEach((dep: Dependency, key: any) => {
      if (key === 'length' || key >= newLength) {
        run(dep)
      }
    })
  } else {
    if (key !== void 0 || depsMap.has(void 0)) {
      run(depsMap.get(key))
    }
    switch (type) {
      case TriggerOpTypes.ADD:
        if (isArrayIndex) {
          run(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.SET:
        // todo 处理map
        break
    }
  }
}

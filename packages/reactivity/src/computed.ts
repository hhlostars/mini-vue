import { hasChanged, isFunction } from '@vue/shared'
import {
  Dependency,
  endTracking,
  link,
  Link,
  startTracking,
  Subscriber,
  SubscriberFlags,
} from './system'
import { activeSub, setActiveSub } from './effect'

export class ComputedRefImpl<T = any> implements Dependency, Subscriber {
  _value: T | undefined = undefined

  // Dependency
  subs: Link | undefined = undefined
  subsTail: Link | undefined = undefined

  // Subscriber
  deps: Link | undefined = undefined
  depsTail: Link | undefined = undefined
  // 两个flag 默认是computed和dirty dirty表示computed需要重新执行获取值
  flags: SubscriberFlags = SubscriberFlags.Computed | SubscriberFlags.Dirty

  constructor(
    public fn,
    private readonly setter,
  ) {}

  get value() {
    const flags = this.flags
    if (flags & SubscriberFlags.Dirty) {
      // Dirty为1时 需要重新计算 否则获取缓存
      processComputedUpdate(this)
    }
    if (activeSub !== undefined) {
      link(this, activeSub)
    }
    return this._value
  }

  set value(newValue) {
    if (this.setter) {
      this.setter(newValue)
    } else {
      console.log('Write operation failed: computed value is readonly')
    }
  }

  update() {
    const prevSub = activeSub
    setActiveSub(this)
    startTracking(this)
    try {
      const oldValue = this._value
      const newValue = this.fn(oldValue)
      if (hasChanged(oldValue, newValue)) {
        this._value = newValue
        return true
      }
      return false
    } finally {
      setActiveSub(prevSub)
      endTracking(this)
    }
  }
}

function processComputedUpdate(computed: ComputedRefImpl) {
  computed.update()
}

export function computed(getterOrOptions: any) {
  let getter, setter
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}

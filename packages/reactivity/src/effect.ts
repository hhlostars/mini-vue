import {
  endTracking,
  Link,
  startTracking,
  Subscriber,
  SubscriberFlags,
} from './system'

export enum EffectFlags {
  /**
   * ReactiveEffect only
   */
  STOP = 1 << 10,
}

export class ReactiveEffect<T = any> {
  deps: Link | undefined = undefined
  depsTail: Link | undefined = undefined
  flags: number = SubscriberFlags.Effect

  constructor(public fn: () => T) {}

  // 当前effect状态
  get active(): boolean {
    return !(this.flags & EffectFlags.STOP)
  }

  notify(): void {
    this.scheduler()
  }

  // 设置schedule时 运行设置的方法 默认执行run
  scheduler(): void {
    this.run()
  }

  run(): T {
    const prevSub = activeSub
    setActiveSub(this)
    startTracking(this)
    try {
      return this.fn()
    } finally {
      setActiveSub(prevSub)
      endTracking(this)
    }
  }

  stop() {
    if (this.active) {
      startTracking(this)
      endTracking(this)
      // cleanupEffect(this)
      // this.onStop && this.onStop()
      this.flags |= EffectFlags.STOP
    }
  }
}

export function effect<T = any>(fn: () => T, options?) {
  const e = new ReactiveEffect(fn)
  if (options) {
    Object.assign(e, options)
  }
  e.run()
  const runner = e.run.bind(e)
  runner.effect = e
  return runner
}

export let activeSub: Subscriber | undefined = undefined

export function setActiveSub(sub: Subscriber | undefined): void {
  activeSub = sub
}

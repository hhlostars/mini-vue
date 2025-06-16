import { endTracking, Link, startTracking, Subscriber } from './system'

export class ReactiveEffect<T = any> {
  deps: Link | undefined = undefined
  depsTail: Link | undefined = undefined

  constructor(public fn: () => T) {}

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

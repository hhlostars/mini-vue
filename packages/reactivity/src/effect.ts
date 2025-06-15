import { Link, Subscriber } from './system'

export class ReactiveEffect<T = any> {
  deps: Link | undefined = undefined
  depsTail: Link | undefined = undefined

  constructor(public fn: () => T) {}

  notify(): void {
    this.scheduler()
  }

  scheduler(): void {
    this.run()
  }

  run(): T {
    setActiveSub(this)
    try {
      return this.fn()
    } finally {
      setActiveSub(undefined)
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

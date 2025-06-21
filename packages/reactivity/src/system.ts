import type { ComputedRefImpl as Computed } from './computed.js'

export interface Dependency {
  subs: Link | undefined
  subsTail: Link | undefined
}

export interface Subscriber {
  deps: Link | undefined
  depsTail: Link | undefined
  // 标记
  flags: SubscriberFlags
}

export interface Link {
  dep: Dependency | Computed
  sub: Subscriber | Computed
  preSub: Link | undefined
  nextSub: Link | undefined
  nextDep: Link | undefined
}

export const enum SubscriberFlags {
  Computed = 1 << 0,
  Effect = 1 << 1,
  Tracking = 1 << 2,
  Recursed = 1 << 4,
  Dirty = 1 << 5,
  PendingComputed = 1 << 6,
  Propagated = Dirty | PendingComputed,
}

export function link(dep: Dependency, sub: Subscriber) {
  // 开始追踪时（effect执行）会将depsTail置空
  const currentDep = sub.depsTail
  if (currentDep !== undefined && currentDep.dep === dep) {
    console.log(123)
    return
  }
  /**
   * 情况1：第一次收集依赖时 currentDep本来就是空 nextDep为sub.deps（空）
   * 情况2：effect 因为依赖修改再执行时
   *      a. 遇到effect中第一个dep时 currentDep 为空
   *      b. 将nextDep指向sub的头结点
   *      c. 此时nextDep存在 nextDep的dep 与 此时link中的dep相等
   *      d. 将sub的尾节点指向nextDep
   *      e. 处理后续的dep currentDep存在 nextDep指向currentDep.nextDep
   *      f. 若nextDep.dep === dep 则是重复依赖
   */
  const nextDep = currentDep !== undefined ? currentDep.nextDep : sub.deps
  // nextDep 不为undefined 则是说明
  if (nextDep !== undefined && nextDep.dep === dep) {
    sub.depsTail = nextDep
    return
  }
  return linkNewDep(dep, sub, nextDep, currentDep)
}

function linkNewDep(
  dep: Dependency,
  sub: Subscriber,
  nextDep: Link | undefined,
  depsTail: Link | undefined,
) {
  const newLink: Link = {
    dep,
    sub,
    preSub: undefined,
    nextSub: undefined,
    nextDep,
  }

  // 将 newDep 插入到dep的双向链表中
  if (dep.subs === undefined) {
    dep.subs = newLink
  } else {
    dep.subsTail.nextSub = newLink
    newLink.preSub = dep.subsTail
  }

  // 将 newDep 插入到sub的双向链表中
  if (depsTail === undefined) {
    sub.deps = newLink
  } else {
    depsTail.nextDep = newLink
  }
  dep.subsTail = newLink
  sub.depsTail = newLink
  return newLink
}

// 更新
export function propagate(current: Link): void {
  let link = current
  let effects = []
  while (link) {
    const sub = link.sub
    const subFlags = sub.flags
    if (subFlags & SubscriberFlags.Computed) {
      // 此时sub是computed 需要通知computed的subs去更新 并将Dirty置为1代表再get computed值时需要重新获取
      sub.flags = subFlags | SubscriberFlags.Dirty
      link = (sub as Dependency).subs
    } else if (!(sub.flags & SubscriberFlags.Tracking)) {
      effects.push(link.sub)
      link = link.nextSub
    }
  }
  effects.forEach(effect => effect.notify())
}

export function startTracking(sub: Subscriber): void {
  sub.depsTail = undefined
  // 清除 Recursed 和 Propagated 标志位。
  // Propagated 中有Dirty PendingComputed标记位置
  // 开始追踪时 dirty 置为false
  // 设置 Tracking 标志位
  sub.flags =
    (sub.flags & ~(SubscriberFlags.Recursed | SubscriberFlags.Propagated)) |
    SubscriberFlags.Tracking
}

export function endTracking(sub: Subscriber): void {
  const depsTail = sub.depsTail
  if (depsTail !== undefined) {
    const nextDep = depsTail.nextDep
    if (nextDep !== undefined) {
      // 尾节点还有nextDep存在说明 需要清理无效的依赖
      clearTacking(nextDep)
      depsTail.nextDep = undefined
    }
  } else if (sub.deps !== undefined) {
    // 清空所有依赖
    // nextDep为undefined 说明没有收集到依赖
    clearTacking(sub.deps)
    sub.deps = undefined
  }
  sub.flags &= ~SubscriberFlags.Tracking
}

function clearTacking(link: Link) {
  do {
    const { dep, nextDep, nextSub, preSub } = link
    // 处理presub
    if (preSub !== undefined) {
      preSub.nextSub = nextSub
    } else {
      dep.subs = nextSub
    }
    // 处理nextSub
    if (nextSub !== undefined) {
      nextSub.preSub = preSub
    } else {
      dep.subsTail = preSub
    }
    link = nextDep!
  } while (link !== undefined)
}

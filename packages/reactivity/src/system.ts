export interface Dependency {
  subs: Link | undefined
  subsTail: Link | undefined
}

export interface Subscriber {
  deps: Link | undefined
  depsTail: Link | undefined
}

export interface Link {
  dep: Dependency
  sub: Subscriber
  preSub: Link | undefined
  nextSub: Link | undefined
  nextDep: Link | undefined
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
    effects.push(link.sub)
    link = link.nextSub
  }
  effects.forEach(effect => effect.notify())
}

export function startTracking(sub: Subscriber): void {
  sub.depsTail = undefined
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

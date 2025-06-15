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
  const currentDep = sub.depsTail
  const nextDep = undefined
  return linkNewDep(dep, sub, nextDep, currentDep)
}

function linkNewDep(
  dep: Dependency,
  sub: Subscriber,
  nextDep: Link | undefined,
  currentDep: Link | undefined,
) {
  const newLink = {
    dep,
    sub,
    preSub: currentDep,
    nextSub: undefined,
    nextDep,
  }

  if (dep.subs === undefined) {
    dep.subs = newLink
  } else {
    dep.subsTail.nextSub = newLink
    newLink.preSub = dep.subsTail
  }
  dep.subsTail = newLink
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

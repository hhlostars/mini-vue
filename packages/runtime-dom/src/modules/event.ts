const veiKey = Symbol('_vei')

function createInvoker(value) {
  /**
   * 创建时间处理函数 调用invoker.value
   * 如果需要更新 则直接修改 invoker.value的值
   */
  const invoker = e => {
    invoker.value(e)
  }
  invoker.value = value
  return invoker
}

export function patchEvent(el, rawName, nextValue) {
  console.log(el, rawName, nextValue)
  const name = rawName.slice(2).toLowerCase()
  el[veiKey] = el[veiKey] ?? {}
  const invokers = el[veiKey]

  const existingInvoker = invokers[rawName]
  if (nextValue) {
    // 如果之前绑定的事件存在
    if (existingInvoker) {
      existingInvoker.value = nextValue
      return
    }
    // 创建新的invoker
    const invoker = createInvoker(nextValue)
    // 缓存到el[veiKey]中
    invokers[rawName] = invoker
    el.addEventListener(name, invoker)
  } else {
    // 如果新的事件没有 老的存在 则移除事件
    if (existingInvoker) {
      el.removeEventListener(name, existingInvoker)
      delete invokers[rawName]
    }
  }
}

import { isSameVNodeType } from './vnode'
import { ShapeFlags } from '@vue/shared'

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = options

  /**
   * 更新和挂载都用这个函数
   * @param n1 旧节点
   * @param n2 新节点
   * @param container 挂载的容器
   * @param anchor
   * @param parentComponent 父组件
   */
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 === n2) return

    if (n1 && !isSameVNodeType(n1, n2)) {
      // 比如说 n1 是 div ，n2 是 span，这俩就不一样，或者 n1 的 key 是1，n2 的 key 是 2，也不一样，都要卸载掉 n1
      // 如果两个节点不是同一个类型，那就卸载 n1 直接挂载 n2
      unmount(n1)
      n1 = null
    }

    if (n1 == null) {
      // 挂载
      mountElement(n2, container, anchor)
    } else {
      // 更新
      patchElement(n1, n2)
    }
  }

  // 卸载子元素
  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }

  // 卸载
  const unmount = vnode => {
    // 卸载
    const { shapeFlag, children } = vnode

    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      unmountChildren(children)
    }

    // 移除 dom 元素
    hostRemove(vnode.el)
  }

  // 挂载子元素
  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      // 递归挂载子节点
      patch(null, child, el)
    }
  }

  const mountElement = (vnode, container, anchor) => {
    /**
     * 1. 创建一个 dom 节点
     * 2. 设置它的 props
     * 3. 挂载它的子节点
     */
    const { type, props, children, shapeFlag } = vnode
    // 创建 dom 元素 type = div p span
    const el = hostCreateElement(type)
    // 复用，更新的时候，复用，卸载，把这个 el 删除，完成卸载
    vnode.el = el

    // 处理 props
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      mountChildren(children, el)
    }

    // 把 el 插入到 container 中
    hostInsert(el, container, anchor)
  }

  const patchProps = (el, oldProps, newProps) => {
    /**
     * 1. 把老的 props 全删掉
     * 2. 把新的 props 全部给它设置上
     */

    if (oldProps) {
      // 把老的 props 全干掉
      for (const key in oldProps) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }

    if (newProps) {
      for (const key in newProps) {
        hostPatchProp(el, key, oldProps?.[key], newProps[key])
      }
    }
  }

  const patchChildren = (n1, n2) => {
    const el = n2.el
    /**
     * 1. 新节点它的子节点是 文本
     *   1.1 老的是数组
     *   1.2 老的也是文本
     * 2. 新节点的子节点是 数组 或者 null
     *   2.1 老的是文本
     *   2.2 老的也是数组
     *   2.3 老的可能是 null
     */

    const prevShapeFlag = n1.shapeFlag

    const shapeFlag = n2.shapeFlag

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      //  新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //  老的是数组，把老的children卸载掉
        unmountChildren(n1.children)
      }

      if (n1.children !== n2.children) {
        // 老的是文本且不一样
        // 设置文本，如果n1和n2的children不一样
        hostSetElementText(el, n2.children)
      }
    } else {
      // 新的不是文本 有可能是 数组 或者 null
      // 老的有可能是 数组 或者 null 或者 文本
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 老的是文本
        // 把老的文本节点干掉
        hostSetElementText(el, '')
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 挂载新的节点
          mountChildren(n2.children, el)
        }
      } else {
        // 老的数组 或者 null
        // 新的还是 数组 或者 null

        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 老的是数组
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的也是数组
            // TODO 全量 diff
            patchKeyedChildren(n1.children, n2.children, el)
          } else {
            // 新的不是数组，卸载老的数组
            unmountChildren(n1.children)
          }
        } else {
          // 老的是 null
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的是数组，挂载新的
            mountChildren(n2.children, el)
          }
        }
      }
    }
  }

  const patchKeyedChildren = (oldC, newC, container) => {
    // 处理前置节点
    let j = 0
    let oldVNode = oldC[j]
    let newVNode = newC[j]
    while (oldVNode && newVNode && isSameVNodeType(oldVNode, newVNode)) {
      patch(oldVNode, newVNode, container)
      j++
      oldVNode = oldC[j]
      newVNode = newC[j]
    }
    // 处理后置节点
    let oldEnd = oldC.length - 1
    let newEnd = newC.length - 1
    oldVNode = oldC[oldEnd]
    newVNode = newC[newEnd]
    while (
      oldEnd >= j &&
      newEnd >= j &&
      oldVNode &&
      newVNode &&
      isSameVNodeType(oldVNode, newVNode)
    ) {
      console.log('chuli houzhi')
      patch(oldVNode, newVNode, container)
      oldEnd--
      newEnd--
      oldVNode = oldC[oldEnd]
      newVNode = newC[newEnd]
    }
    console.log(j, oldEnd, newEnd)
    if (j > oldEnd && j <= newEnd) {
      // 旧节点处理完 存在多的新节点 要新增
      console.log('add')
      let idx = newEnd
      let addAnchor = newC[idx + 1].el
      while (idx >= j) {
        patch(null, newC[idx--], container, addAnchor)
        addAnchor = newC[idx + 1].el
      }
    } else if (j > newEnd && oldEnd >= j) {
      // 新节点处理完 存在多的旧节点 要删除 j - oldEnd
      console.log('delete')
      while (j <= oldEnd) {
        unmount(oldC[j++])
      }
    } else {
      // 乱序情况
      console.log('j', j, newEnd, oldEnd)
      // 还没处理的新节点的key和index的map
      const keyToNewIndexMap = new Map()
      // 记录newC中没有处理的节点 在oldC中的位置
      const newIndexToOldIndexMap = new Array(newEnd - j + 1).fill(-1)
      console.log(newIndexToOldIndexMap)

      for (let i = j; i <= newEnd; i++) {
        const n2 = newC[i]
        keyToNewIndexMap.set(n2.key, i)
      }
      console.log(keyToNewIndexMap)

      let pos = -1
      let moved = false

      // 遍历老节点 找到可以复用的
      for (let i = j; i <= oldEnd; i++) {
        const n1 = oldC[i]
        const newIndex = keyToNewIndexMap.get(n1.key)
        if (newIndex !== undefined) {
          if (newIndex > pos) {
            // 通过老节点找到新节点的位置 如果新节点的位置是递增的 则说明此时不需要移动
            pos = newIndex
          } else {
            // 若不是递增则说明要移动
            moved = true
          }
          newIndexToOldIndexMap[newIndex] = i
          patch(n1, newC[newIndex], container)
        } else {
          // 没找到卸载
          console.log('not found delete')
          unmount(n1)
        }
      }
      console.log(moved)
      console.log(newIndexToOldIndexMap)
      // 如果需要移动则计算最长递增子序列
      const newIndexSeq = moved ? getSeq(newIndexToOldIndexMap) : []
      const set = new Set(newIndexSeq)

      /**
       * 遍历newC 倒序插入
       */
      for (let i = newEnd; i >= j; i--) {
        const n2 = newC[i]
        const anchor = newC[i + 1]?.el || null
        if (n2.el) {
          if (moved) {
            // 在最长递增子序列中则需要移动
            if (!set.has(i)) {
              console.log('need move')
              hostInsert(n2.el, container, anchor)
            }
          }
        } else {
          patch(null, n2, container, anchor)
        }
      }
    }
  }

  const patchElement = (n1, n2) => {
    /**
     * 1. 复用 dom 元素
     * 2. 更新 props
     * 3. 更新 children
     */
    // 复用 dom 元素 每次进来，都拿上一次的 el，保存到最新的虚拟节点上 n2.el
    const el = (n2.el = n1.el)

    // 更新 props
    const oldProps = n1.props
    const newProps = n2.props
    patchProps(el, oldProps, newProps)

    // 更新 children
    patchChildren(n1, n2)
  }

  const render = (vnode, container) => {
    /**
     * 分三步：
     * 1. 挂载
     * 2. 更新
     * 3. 卸载
     */
    if (vnode == null) {
      if (container._vnode) {
        // 卸载
        unmount(container._vnode)
      }
    } else {
      // 挂载和更新
      patch(container._vnode, vnode, container)
    }

    // 把新的 vnode 保存到 container中
    container._vnode = vnode
  }

  return {
    render,
  }
}

function getSeq(arr) {
  const result = []
  // 记录前驱节点
  const map = new Map()
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    if (item === -1 || item === undefined) continue

    if (result.length === 0) {
      result.push(i)
      continue
    }

    const lastIndex = result[result.length - 1]
    const lastItem = arr[lastIndex]

    if (item > lastItem) {
      // 大于上一个直接放入result
      result.push(i)
      map.set(i, lastIndex)
      continue
    }

    let left = 0
    let right = result.length - 1
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midItem = arr[result[mid]]
      if (midItem < item) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    result[left] = i
    map.set(i, result[left - 1])

    // 反向追溯
    let l = result.length
    let last = result[l - 1]

    while (l > 0) {
      l--
      // 纠正顺序
      result[l] = last
      // 去前驱节点里面找
      last = map.get(last)
    }

    return result
  }
}

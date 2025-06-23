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

  const patchKeyedChildren = (c1, c2, container) => {}

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

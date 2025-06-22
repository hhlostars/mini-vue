import {
  isArray,
  isFunction,
  isNumber,
  isObject,
  isString,
  ShapeFlags,
} from '@vue/shared'

export function isVNode(value) {
  return value?.__v_isVNode
}

export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

function normalizeChildren(vnode, children) {
  let { shapeFlag } = vnode
  if (isArray(children)) {
    /**
     * children = [h('p','hello'),h('p','world')]
     */
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
    /**
     * 对象
     * children = {header:()=>h('div','hello world')}
     */
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 如果是个组件，那就是插槽
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
  } else if (isNumber(children) || isString(children)) {
    children = String(children)
    shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }

  /**
   * 处理完了重新赋值 shapeFlag 和 children
   */
  vnode.shapeFlag = shapeFlag
  vnode.children = children
  return children
}

/**
 * 创建vdom的底层方法
 * @param type
 * @param props
 * @param children
 */
export function createVNode(type, props?, children = null) {
  let shapeFlag = 0

  if (isString(type)) {
    // div span p h1...
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    // 有状态组件
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (isFunction(type)) {
    // 函数式组件
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
  }

  const vnode = {
    // 标记
    __v_isVNode: true,
    type,
    props,
    children: null,
    // 用作diff
    key: props?.key,
    // vnode挂载的节点
    el: null,
    shapeFlag,
  }

  normalizeChildren(vnode, children)

  return vnode
}

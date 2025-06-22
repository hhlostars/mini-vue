export enum ShapeFlags {
  // 表示 DOM 元素
  ELEMENT = 1,
  // 表示函数组件
  FUNCTIONAL_COMPONENT = 1 << 1,
  // 表示有状态组件
  STATEFUL_COMPONENT = 1 << 2,
  // 表示子节点 是纯文本
  TEXT_CHILDREN = 1 << 3,
  // 表示子节点 是数组
  ARRAY_CHILDREN = 1 << 4,
  // 表示子节点 是通过slot传入的
  SLOTS_CHILDREN = 1 << 5,
  // 表示 Teleport 组件 用于将子组件传送到其他位置
  TELEPORT = 1 << 6,
  // 表示Suspense组件 用于处理异步加载组件
  SUSPENSE = 1 << 7,
  // 表示该组件应当被 keep-alive 缓存
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  // 表示该组件已经被 keep-alive 缓存
  COMPONENT_KEPT_ALIVE = 1 << 9,
  // 表示组件类型 有状态组件和无状态函数组件的组合
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
}

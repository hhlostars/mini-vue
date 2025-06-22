import { patchClass } from './modules/patchClass'
import { patchStyle } from './modules/patchStyle'
import { isOn } from '@vue/shared'
import { patchEvent } from './modules/event'
import { patchAttr } from './modules/patchAttr'

export function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    return patchClass(el, nextValue)
  }
  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue)
  }
  // 事件处理
  if (isOn(key)) {
    return patchEvent(el, key, nextValue)
  }

  patchAttr(el, key, nextValue)
}

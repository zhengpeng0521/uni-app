import { reactive, nextTick, watchEffect } from 'vue'
import { extend } from '@vue/shared'
import {
  defineAsyncApi,
  ShowToastOptions,
  ShowToastProtocol,
  ShowLoadingProtocol,
  ShowLoadingOptions,
  API_SHOW_TOAST,
  API_SHOW_LOADING,
  API_HIDE_TOAST,
  API_HIDE_LOADING,
} from '@dcloudio/uni-api'
import Toast, { ToastProps } from './toast'
import { ensureRoot, createRootApp } from './utils'
import {
  useI18n,
  initI18nShowLoadingMsgsOnce,
  initI18nShowToastMsgsOnce,
} from '@dcloudio/uni-core'

import type {
  API_TYPE_SHOW_LOADING,
  API_TYPE_HIDE_TOAST,
  API_TYPE_HIDE_LOADING,
  API_TYPE_SHOW_TOAST,
} from '@dcloudio/uni-api'

let showToastState: ToastProps
let showType: 'onShowToast' | 'onShowLoading' | '' = ''
let timeoutId: number

function createToast(args: ToastProps) {
  if (!showToastState) {
    showToastState = reactive(args)
    // 异步执行，避免干扰 getCurrentInstance
    nextTick(() => {
      createRootApp(Toast, showToastState, () => {}).mount(ensureRoot('u-a-t'))
    })
  } else {
    extend(showToastState, args)
  }

  setTimeout(() => {
    // 延迟一下 show 可解决窗口打开前调用 showToast 在 onHidePopup 之后触发
    showToastState.visible = true
  }, 10)

  watchEffect(() => {
    if (showToastState.visible) {
      timeoutId && clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        hidePopup('onHideToast')
      }, showToastState.duration)
    }
  })
}

export const showToast = defineAsyncApi<API_TYPE_SHOW_TOAST>(
  API_SHOW_TOAST,
  (args, { resolve, reject }) => {
    initI18nShowToastMsgsOnce()
    createToast(args as ToastProps)
    showType = 'onShowToast'
    resolve()
  },
  ShowToastProtocol,
  ShowToastOptions
)

// 此项为抹平与showToast参数差距
const showLoadingDefaultState = {
  icon: 'loading',
  duration: 100000000,
  image: '',
}
export const showLoading = defineAsyncApi<API_TYPE_SHOW_LOADING>(
  API_SHOW_LOADING,
  (args, { resolve, reject }) => {
    extend(args, showLoadingDefaultState)
    initI18nShowLoadingMsgsOnce()
    createToast(args as ToastProps)
    showType = 'onShowLoading'
    resolve()
  },
  ShowLoadingProtocol,
  ShowLoadingOptions
)

export const hideToast = defineAsyncApi<API_TYPE_HIDE_TOAST>(
  API_HIDE_TOAST,
  (args, { resolve, reject }) => {
    hidePopup('onHideToast')
    resolve()
  }
)

export const hideLoading = defineAsyncApi<API_TYPE_HIDE_LOADING>(
  API_HIDE_LOADING,
  (args, { resolve, reject }) => {
    hidePopup('onHideLoading')
    resolve()
  }
)

const hidePopup = (type: 'onHideToast' | 'onHideLoading') => {
  const { t } = useI18n()
  if (!showType) {
    return
  }
  let warnMsg = ''
  if (type === 'onHideToast' && showType !== 'onShowToast') {
    warnMsg = t('uni.showToast.unpaired')
  } else if (type === 'onHideLoading' && showType !== 'onShowLoading') {
    warnMsg = t('uni.showLoading.unpaired')
  }
  if (warnMsg) {
    return console.warn(warnMsg)
  }
  showType = ''
  setTimeout(() => {
    // 与 show 对应延迟10ms，避免快速调用 show，hide 导致无法关闭
    showToastState.visible = false
  }, 10)
}
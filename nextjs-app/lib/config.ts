import { refresh } from './env'

/**
 * 获取 TanStack Query 的配置
 * 统一管理数据请求的刷新和重新验证行为
 */
export function getQueryConfig() {
  return {
    refetchInterval: refresh.enabled ? refresh.intervalMs : false,
    refetchOnWindowFocus: refresh.onFocus && refresh.enabled,
    refetchOnReconnect: refresh.onReconnect && refresh.enabled,
    staleTime: 5000, // 数据在 5 秒内被视为新鲜
  } as const
}

// 保留旧的 SWR 配置函数以兼容可能存在的其他代码
/** @deprecated 请使用 getQueryConfig() 替代 */
export function getSWRConfig() {
  return {
    refreshInterval: refresh.enabled ? refresh.intervalMs : 0,
    revalidateOnFocus: refresh.onFocus && refresh.enabled,
    revalidateOnReconnect: refresh.onReconnect && refresh.enabled,
  } as const
}

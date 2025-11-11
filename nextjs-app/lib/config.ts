export const AUTO_REFRESH_ENABLED: boolean = (process.env.NEXT_PUBLIC_AUTO_REFRESH_ENABLED ?? 'true') !== 'false'
export const SWR_REFRESH_MS: number = Number(process.env.NEXT_PUBLIC_SWR_REFRESH_MS || '15000')
export const SWR_REVALIDATE_ON_FOCUS: boolean = (process.env.NEXT_PUBLIC_SWR_REVALIDATE_ON_FOCUS ?? 'true') !== 'false'
export const SWR_REVALIDATE_ON_RECONNECT: boolean = (process.env.NEXT_PUBLIC_SWR_REVALIDATE_ON_RECONNECT ?? 'true') !== 'false'

export function getSWRConfig() {
  return {
    refreshInterval: AUTO_REFRESH_ENABLED ? SWR_REFRESH_MS : 0,
    revalidateOnFocus: SWR_REVALIDATE_ON_FOCUS && AUTO_REFRESH_ENABLED,
    revalidateOnReconnect: SWR_REVALIDATE_ON_RECONNECT && AUTO_REFRESH_ENABLED,
  } as const
}

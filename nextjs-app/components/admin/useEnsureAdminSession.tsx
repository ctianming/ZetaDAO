"use client"
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { isMobileUA, createPairingUri, buildWalletDeepLink, openDeepLink } from '@/lib/wallet/walletconnect'
import { connectAndSignMessage } from '@/lib/wallet/walletService'
import { getZetaChainConfig } from '@/lib/web3'

export interface UseEnsureAdminSessionResult {
  isAdmin: boolean
  loading: boolean
  error: string | null
  refresh: () => void
  address?: string
}

/**
 * 统一的管理员会话确保 Hook：
 * 1. 检查现有 admin_session（/api/auth/is-admin）
 * 2. 若未认证 → 发起挑战 (/api/auth/admin/challenge) → 钱包签名 → 验证 (/api/auth/admin/verify)
 * 3. 颁发 httpOnly Cookie 后标记 isAdmin
 * 失败时返回 error，外层可展示指引。
 */
export function useEnsureAdminSession(): UseEnsureAdminSessionResult {
  const { address, isConnected, status } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const { show } = useToast()
  const { openConnectModal } = useConnectModal()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoPrompted, setAutoPrompted] = useState(false)
  const mountedRef = useRef(false)
  const runningRef = useRef(false)
  const attemptsRef = useRef(0)

  // Safe setter: if component not mounted yet, defer the update slightly
  const safeSet = useCallback((setter: (v: any) => void, value: any) => {
    if (mountedRef.current) {
      try { setter(value) } catch {}
    } else {
      // defer to next tick to avoid setState during render of other components
      setTimeout(() => { try { setter(value) } catch {} }, 0)
    }
  }, [])

  const ensureProviderAuthorized = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    // Enhanced provider detection: support multiple wallet scenarios
    let eth: any = (window as any).ethereum
    
    // If multiple wallets are installed, try to find the preferred one
    if (eth?.providers && Array.isArray(eth.providers)) {
      // Prefer MetaMask if available
      const metamask = eth.providers.find((p: any) => p.isMetaMask)
      if (metamask) eth = metamask
      else eth = eth.providers[0] // Fallback to first provider
    }
    
    if (!eth?.request) {
      throw new Error('未检测到钱包扩展，请安装 MetaMask 或其他兼容钱包')
    }
    // 1) Accounts
    let accs: string[] = []
    try {
      accs = await eth.request({ method: 'eth_accounts' })
    } catch {}
    if (!Array.isArray(accs) || accs.length === 0) {
      try {
        accs = await eth.request({ method: 'eth_requestAccounts' })
      } catch (reqErr: any) {
        // 抛出原始错误以便上层能基于 code 做不同处理（例如 4001 表示拒绝/未弹窗）
        throw reqErr
      }
    }
    // 2) Chain
    try {
      const { CHAIN } = getZetaChainConfig()
      const expectedHex = '0x' + CHAIN.id.toString(16)
      const currentHex = await eth.request({ method: 'eth_chainId' })
      if (currentHex?.toLowerCase() !== expectedHex.toLowerCase()) {
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: expectedHex }] })
        } catch (swErr: any) {
          // 忽略链添加（需要完整参数），提示用户手动切换
          throw new Error('请在钱包中切换到正确的网络后重试')
        }
      }
    } catch (chainErr) {
      throw chainErr
    }
  }, [])

  const run = useCallback(async () => {
    console.log('🔵 [useEnsureAdminSession] Button clicked - run() invoked', { 
      address, 
      isConnected, 
      status, 
      running: runningRef.current,
      timestamp: new Date().toISOString()
    })

    // Pre-flight check 1: Secure context (HTTPS requirement for Web3)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.error('❌ [useEnsureAdminSession] INSECURE CONTEXT - Web3 operations require HTTPS')
      safeSet(setError, '⚠️ 不安全的连接 (HTTP)。请使用 HTTPS 访问本站以启用钱包功能。')
      return
    }

    // Pre-flight check 2: Ensure hooks are properly initialized
    if (!openConnectModal) {
      console.error('❌ [useEnsureAdminSession] openConnectModal is undefined - RainbowKit not initialized')
      safeSet(setError, '⚠️ 钱包连接功能未正确初始化，请刷新页面重试。')
      return
    }

    if (!signMessageAsync) {
      console.error('❌ [useEnsureAdminSession] signMessageAsync is undefined - Wagmi not initialized')
      safeSet(setError, '⚠️ 钱包签名功能未正确初始化，请刷新页面重试。')
      return
    }

    if (runningRef.current) {
      console.log('⏸️ [useEnsureAdminSession] 已有认证流程在运行中，跳过')
      return
    }

    runningRef.current = true
    safeSet(setLoading, true)
    safeSet(setError, null)
    console.log('✅ [useEnsureAdminSession] 开始认证流程...')
    // First: check whether server already has an admin session (httpOnly cookie)
    try {
      console.log('[useEnsureAdminSession] fetching /api/auth/is-admin')
      const r0 = await fetch('/api/auth/is-admin', { cache: 'no-store' })
      const j0 = await r0.json().catch(() => ({}))
      if (j0?.isAdmin) {
        safeSet(setIsAdmin, true)
        runningRef.current = false
        safeSet(setLoading, false)
        return
      }
    } catch (e) {
      // ignore and continue to normal flow
    }
    // If no server session, require wallet connection to proceed
    if (!isConnected || status !== 'connected' || !address) {
      safeSet(setIsAdmin, false)
      runningRef.current = false
      safeSet(setLoading, false)
      return
    }
    try {
      // 0) 强化预检：账户授权 + 链一致性
      try {
        await ensureProviderAuthorized()
      } catch (preErr: any) {
        console.log('ensureProviderAuthorized preErr', preErr)
        const msg = String(preErr?.message || '')
        // 未授权：提示连接；移动端尝试深链
        if (/未授权|not\s*been\s*authorized/i.test(msg) || preErr?.code === 4100 || preErr?.code === 4001) {
          // code===4001 表示钱包拒绝了账户访问或用户未看到授权弹窗，优先提示并打开连接模态
          if (isMobileUA()) {
            try {
              const { uri } = await createPairingUri()
              const link = buildWalletDeepLink('metamask', uri)
              openDeepLink(link, '_self')
            } catch {}
          } else {
            try { disconnect() } catch {}
            if (openConnectModal) openConnectModal()
          }
          setError(preErr?.code === 4001 ? '钱包未完成授权，请在钱包中允许账户访问并重试。' : '当前页面尚未获得钱包授权，请完成连接与授权后再试。')
          return
        }
        // 链不匹配
        if (/切换到正确的网络/.test(msg)) {
          setError('请在钱包中切换到正确的网络后重试')
          return
        }
        // 其他错误透传
        throw preErr
      }
      // 1) 先检测是否已有 session
      const r0 = await fetch('/api/auth/is-admin', { cache: 'no-store' })
      const j0 = await r0.json().catch(() => ({}))
      if (j0?.isAdmin) { safeSet(setIsAdmin, true); runningRef.current = false; safeSet(setLoading, false); return }

      const allowNoSign = String(process.env.NEXT_PUBLIC_ADMIN_ALLOW_NO_SIGN || '').toLowerCase() === 'true'
      if (allowNoSign) {
        // Temporary flow: do not require signature, only require connected admin wallet
        const vr = await fetch('/api/auth/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) })
        const vj = await vr.json().catch(() => ({}))
        if (!vr.ok || !vj?.success) {
          setError(vj?.error || '校验失败'); setIsAdmin(false); return
        }
        safeSet(setIsAdmin, true)
        show('管理员认证成功（无签名模式）', { type: 'success' })
      } else {
        // 2) 发起挑战
        const ch = await fetch('/api/auth/admin/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet: address }) })
        const jc = await ch.json().catch(() => ({}))
        // 严格验证：必须包含 nonce, timestamp, expiresAt 三个字段
        if (!ch.ok || !jc?.success || !jc?.nonce || !jc?.timestamp || !jc?.expiresAt) {
          console.error('[Admin Auth] 挑战响应不完整:', jc)
          setError(jc?.error || '挑战失败：服务器响应不完整'); setIsAdmin(false); return
        }
        // Build message with timestamp for enhanced security
        const message = `Admin access to ZetaDAO\n\nNonce: ${jc.nonce}\nTimestamp: ${jc.timestamp}\nExpires: ${jc.expiresAt}`
        console.log('[Admin Auth] 构建的签名消息:', message)
        let signature: string
        try {
          signature = await signMessageAsync({ message })
        } catch (err: any) {
          // 处理常见“未授权来源”错误，引导用户先连接钱包
          const msg = `${err?.message || ''}`
          if (err?.code === 4100 || /not\s*been\s*authorized/i.test(msg)) {
            // 优先移动端：直接通过 WalletConnect 连接并完成消息签名
            if (isMobileUA()) {
              try {
                const res = await connectAndSignMessage('metamask', message)
                signature = res.signature
              } catch (wcErr: any) {
                setError(wcErr?.message || '移动端签名失败，请重试或更换钱包')
                return
              }
            } else {
              try { disconnect() } catch {}
              setError('签名被拒绝或未授权，请在重新连接后再次点击“重新认证”。')
              if (openConnectModal) openConnectModal()
              return
            }
          }
          if (err?.code === 4001) {
            setError('已取消签名请求，可在钱包中重新尝试。')
            return
          }
          throw err
        }
        const vr = await fetch('/api/auth/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, message, signature }) })
        const vj = await vr.json().catch(() => ({}))
        if (!vr.ok || !vj?.success) {
          setError(vj?.error || '签名校验失败'); setIsAdmin(false); return
        }
        safeSet(setIsAdmin, true)
        show('管理员认证成功', { type: 'success' })
      }
    } catch (e: any) {
      console.error('ensure admin session error', e)
      // Detect network errors (Failed to fetch) and provide a more specific message.
      const errorMessage = (e instanceof TypeError && e.message === 'Failed to fetch')
        ? '网络请求失败，请检查您的网络连接并重试。'
        : (e?.message || '管理员认证异常')
      safeSet(setError, errorMessage)
      safeSet(setIsAdmin, false)
    } finally {
      safeSet(setLoading, false)
      runningRef.current = false
      attemptsRef.current += 1
    }
  }, [address, isConnected, status, signMessageAsync, show, openConnectModal, disconnect, ensureProviderAuthorized, safeSet])

  // Expose a global debug hook so operators can manually trigger the flow from the browser console:
  //   window.__zd_admin_refresh && window.__zd_admin_refresh()
  useEffect(() => {
    try {
      (window as any).__zd_admin_refresh = run
      console.log('[useEnsureAdminSession] __zd_admin_refresh assigned on window')
    } catch {}
    return () => { try { delete (window as any).__zd_admin_refresh } catch {} }
  }, [run])

  // 仅检查服务器 session（不触发钱包签名）。点击“开始认证”时请调用返回的 refresh()/run()
  const checkSession = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/is-admin', { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (j?.isAdmin) safeSet(setIsAdmin, true)
      else safeSet(setIsAdmin, false)
    } catch (e) {
      safeSet(setIsAdmin, false)
    }
  }, [safeSet])

  // 在地址变化或挂载时只检查服务器端 session，不自动触发签名流程
  useEffect(() => { 
    if (mountedRef.current) {
      checkSession() 
    }
  }, [address, checkSession])

  // track mounted state to avoid setState during other component's render
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // 若未认证且处于未连接状态，桌面端自动拉起连接弹窗（避免直接触发未授权报错）
  useEffect(() => {
    if (!isAdmin && status === 'disconnected' && !autoPrompted) {
      setAutoPrompted(true)
      if (openConnectModal) openConnectModal()
    }
  }, [isAdmin, status, openConnectModal, autoPrompted])

  return { isAdmin, loading, error, refresh: run, address }
}

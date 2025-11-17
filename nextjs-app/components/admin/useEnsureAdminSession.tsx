"use client"
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { isMobileUA, createPairingUri, buildWalletDeepLink, openDeepLink } from '@/lib/wallet/walletconnect'
import { connectAndSignMessage } from '@/lib/wallet/walletService'
import { getZetaChainConfig } from '@/lib/web3'
import { useAdminStore } from '@/stores/adminStore'

export interface UseEnsureAdminSessionResult {
  isAdmin: boolean
  loading: boolean
  error: string | null
  refresh: () => void
  address?: string
  needsConnection: boolean
}

/**
 * 统一的管理员会话确保 Hook（使用全局 Store 版本）：
 * 
 * 关键改进：
 * - 使用 Zustand 全局 store 管理认证状态
 * - 状态在整个应用中共享，避免每次页面导航都重新检查
 * - 只在应用首次加载或用户手动刷新时检查服务器 session
 * - 移除了对 RainbowKit 的依赖
 */
export function useEnsureAdminSession(): UseEnsureAdminSessionResult {
  const { address, isConnected, status } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const { show } = useToast()
  
  // 从全局 store 读取状态
  const {
    isAdmin,
    loading,
    error,
    needsConnection,
    sessionChecked,
    setIsAdmin,
    setLoading,
    setError,
    setAddress,
    setNeedsConnection,
    setSessionChecked,
    setInitialCheckDone,
  } = useAdminStore()
  
  const mountedRef = useRef(false)
  const runningRef = useRef(false)

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
          throw new Error('请在钱包中切换到正确的网络后重试')
        }
      }
    } catch (chainErr) {
      throw chainErr
    }
  }, [])

  const run = useCallback(async () => {
    console.log('🔵 [useEnsureAdminSession] run() invoked', { 
      address, 
      isConnected, 
      status, 
      running: runningRef.current,
      sessionChecked,
      timestamp: new Date().toISOString()
    })

    // Pre-flight check: Secure context (HTTPS requirement for Web3)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.error('❌ [useEnsureAdminSession] INSECURE CONTEXT')
      setError('⚠️ 不安全的连接 (HTTP)。请使用 HTTPS 访问本站以启用钱包功能。')
      return
    }

    // Pre-flight check: Ensure signMessageAsync is available
    if (!signMessageAsync) {
      console.error('❌ [useEnsureAdminSession] signMessageAsync is undefined')
      setError('⚠️ 钱包签名功能未正确初始化，请刷新页面重试。')
      return
    }

    if (runningRef.current) {
      console.log('⏸️ [useEnsureAdminSession] 已有认证流程在运行中，跳过')
      return
    }

    runningRef.current = true
    setLoading(true)
    setError(null)
    console.log('✅ [useEnsureAdminSession] 开始认证流程...')
    
    try {
      // First: check whether server already has an admin session (httpOnly cookie)
      console.log('[useEnsureAdminSession] fetching /api/auth/is-admin')
      const r0 = await fetch('/api/auth/is-admin', { cache: 'no-store' })
      const j0 = await r0.json().catch(() => ({}))
      
      if (j0?.isAdmin) {
        console.log('✅ [useEnsureAdminSession] 服务器 session 有效')
        setIsAdmin(true)
        setNeedsConnection(false)
        setSessionChecked(true)
        setInitialCheckDone(true)
        setAddress(address)
        runningRef.current = false
        setLoading(false)
        return
      }
      
      // Mark that we've checked the session
      setSessionChecked(true)
      setInitialCheckDone(true)
      
      // If no server session, require wallet connection to proceed
      if (!isConnected || status !== 'connected' || !address) {
        console.log('⚠️ [useEnsureAdminSession] Wallet not connected')
        setIsAdmin(false)
        setNeedsConnection(true)
        setError('请先连接您的管理员钱包')
        runningRef.current = false
        setLoading(false)
        return
      }
      
      // Wallet is connected, clear the needsConnection flag
      setNeedsConnection(false)
      setAddress(address)
      
      // 0) 强化预检：账户授权 + 链一致性
      try {
        await ensureProviderAuthorized()
      } catch (preErr: any) {
        console.log('ensureProviderAuthorized preErr', preErr)
        const msg = String(preErr?.message || '')
        
        // 未授权：提示连接
        if (/未授权|not\s*been\s*authorized/i.test(msg) || preErr?.code === 4100 || preErr?.code === 4001) {
          if (isMobileUA()) {
            try {
              const { uri } = await createPairingUri()
              const link = buildWalletDeepLink('metamask', uri)
              openDeepLink(link, '_self')
            } catch {}
          } else {
            try { disconnect() } catch {}
            setNeedsConnection(true)
          }
          setError(preErr?.code === 4001 ? '钱包未完成授权，请在钱包中允许账户访问并重试。' : '当前页面尚未获得钱包授权，请完成连接与授权后再试。')
          return
        }
        
        // 链不匹配
        if (/切换到正确的网络/.test(msg)) {
          setError('请在钱包中切换到正确的网络后重试')
          return
        }
        
        throw preErr
      }

      const allowNoSign = String(process.env.NEXT_PUBLIC_ADMIN_ALLOW_NO_SIGN || '').toLowerCase() === 'true'
      
      if (allowNoSign) {
        // Temporary flow: do not require signature, only require connected admin wallet
        const vr = await fetch('/api/auth/admin/verify', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ address }) 
        })
        const vj = await vr.json().catch(() => ({}))
        
        if (!vr.ok || !vj?.success) {
          setError(vj?.error || '校验失败')
          setIsAdmin(false)
          return
        }
        
        setIsAdmin(true)
        setInitialCheckDone(true)
        show('管理员认证成功（无签名模式）', { type: 'success' })
      } else {
        // 2) 发起挑战
        const ch = await fetch('/api/auth/admin/challenge', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ wallet: address }) 
        })
        const jc = await ch.json().catch(() => ({}))
        
        // 严格验证：必须包含 nonce, timestamp, expiresAt 三个字段
        if (!ch.ok || !jc?.success || !jc?.nonce || !jc?.timestamp || !jc?.expiresAt) {
          console.error('[Admin Auth] 挑战响应不完整:', jc)
          setError(jc?.error || '挑战失败：服务器响应不完整')
          setIsAdmin(false)
          return
        }
        
        // Build message with timestamp for enhanced security
        const message = `Admin access to ZetaDAO\n\nNonce: ${jc.nonce}\nTimestamp: ${jc.timestamp}\nExpires: ${jc.expiresAt}`
        console.log('[Admin Auth] 构建的签名消息:', message)
        
        let signature: string
        try {
          signature = await signMessageAsync({ message })
        } catch (err: any) {
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
              setNeedsConnection(true)
              setError('签名被拒绝或未授权，请重新连接钱包后再次点击"重新认证"。')
              return
            }
          }
          
          if (err?.code === 4001) {
            setError('已取消签名请求，可在钱包中重新尝试。')
            return
          }
          
          throw err
        }
        
        const vr = await fetch('/api/auth/admin/verify', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ address, message, signature }) 
        })
        const vj = await vr.json().catch(() => ({}))
        
        if (!vr.ok || !vj?.success) {
          setError(vj?.error || '签名校验失败')
          setIsAdmin(false)
          return
        }
        
        setIsAdmin(true)
        setInitialCheckDone(true)
        show('管理员认证成功', { type: 'success' })
      }
    } catch (e: any) {
      console.error('ensure admin session error', e)
      const errorMessage = (e instanceof TypeError && e.message === 'Failed to fetch')
        ? '网络请求失败，请检查您的网络连接并重试。'
        : (e?.message || '管理员认证异常')
      setError(errorMessage)
      setIsAdmin(false)
    } finally {
      setLoading(false)
      runningRef.current = false
    }
  }, [address, isConnected, status, signMessageAsync, show, disconnect, ensureProviderAuthorized, sessionChecked, setIsAdmin, setLoading, setError, setAddress, setNeedsConnection, setSessionChecked, setInitialCheckDone])

  // Expose a global debug hook
  useEffect(() => {
    try {
      (window as any).__zd_admin_refresh = run
      console.log('[useEnsureAdminSession] __zd_admin_refresh assigned on window')
    } catch {}
    return () => { try { delete (window as any).__zd_admin_refresh } catch {} }
  }, [run])

  // 仅在首次挂载时检查服务器 session（如果尚未检查过）
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      
      // 只在未检查过 session 时才执行检查
      if (!sessionChecked && !runningRef.current) {
        console.log('[useEnsureAdminSession] 首次挂载，检查服务器 session')
        
        const checkSession = async () => {
          try {
            const r = await fetch('/api/auth/is-admin', { cache: 'no-store' })
            const j = await r.json().catch(() => ({}))
            
            if (j?.isAdmin) {
              console.log('✅ [useEnsureAdminSession] 服务器 session 有效')
              setIsAdmin(true)
              setNeedsConnection(false)
            } else {
              console.log('⚠️ [useEnsureAdminSession] 无有效 session')
              setIsAdmin(false)
            }
            
            setSessionChecked(true)
            setInitialCheckDone(true)
            setLoading(false) // 完成首次检查后，关闭 loading 状态
          } catch (e) {
            console.error('[useEnsureAdminSession] 检查 session 失败', e)
            setIsAdmin(false)
            setSessionChecked(true)
            setInitialCheckDone(true)
            setLoading(false)
          }
        }
        
        checkSession()
      }
    }
  }, [sessionChecked, setIsAdmin, setNeedsConnection, setSessionChecked, setInitialCheckDone, setLoading])

  // Update needsConnection based on wallet connection status
  useEffect(() => {
    if (!isAdmin && (!isConnected || status !== 'connected')) {
      setNeedsConnection(true)
    } else if (isConnected && status === 'connected') {
      setNeedsConnection(false)
      setAddress(address)
    }
  }, [isAdmin, isConnected, status, address, setNeedsConnection, setAddress])

  return { isAdmin, loading, error, refresh: run, address, needsConnection }
}

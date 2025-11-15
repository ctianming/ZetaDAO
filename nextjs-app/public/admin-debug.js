/**
 * 管理员认证诊断脚本
 * 在浏览器控制台中运行此脚本以诊断认证问题
 * 
 * 使用方法：
 * 1. 打开 F12 开发者工具
 * 2. 进入 Console 标签页
 * 3. 复制并粘贴此脚本
 * 4. 按 Enter 运行
 */

(async function adminAuthDiagnostics() {
  console.log('=== ZetaDAO 管理员认证诊断 ===\n')

  const results = {
    passed: [],
    failed: [],
    warnings: []
  }

  // 1. 检查页面是否是管理员页面
  console.log('1️⃣ 检查当前页面...')
  const isAdminPage = window.location.pathname.includes('/admin')
  if (isAdminPage) {
    results.passed.push('✅ 当前在管理员页面')
    console.log('   ✅ 当前在管理员页面')
  } else {
    results.warnings.push('⚠️  不在管理员页面，某些检查可能不适用')
    console.log('   ⚠️  不在管理员页面')
  }

  // 2. 检查钱包扩展
  console.log('\n2️⃣ 检查钱包扩展...')
  if (window.ethereum) {
    results.passed.push('✅ 检测到钱包扩展')
    console.log('   ✅ 检测到钱包扩展')
    
    // 检查是否是 MetaMask
    if (window.ethereum.isMetaMask) {
      console.log('   ℹ️  钱包类型: MetaMask')
    }
    
    // 检查账户
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts && accounts.length > 0) {
        results.passed.push(`✅ 已连接账户: ${accounts[0]}`)
        console.log(`   ✅ 已连接账户: ${accounts[0]}`)
      } else {
        results.warnings.push('⚠️  钱包未授权或未连接账户')
        console.log('   ⚠️  钱包未授权或未连接账户')
      }
    } catch (err) {
      results.failed.push(`❌ 获取账户失败: ${err.message}`)
      console.log(`   ❌ 获取账户失败: ${err.message}`)
    }

    // 检查网络
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const chainIdDec = parseInt(chainId, 16)
      console.log(`   ℹ️  当前网络 Chain ID: ${chainIdDec} (${chainId})`)
      
      // ZetaChain Athens Testnet = 7001
      if (chainIdDec === 7001) {
        results.passed.push('✅ 网络正确 (ZetaChain Athens Testnet)')
        console.log('   ✅ 网络正确 (ZetaChain Athens Testnet)')
      } else {
        results.warnings.push(`⚠️  网络可能不正确，当前: ${chainIdDec}，期望: 7001`)
        console.log(`   ⚠️  网络可能不正确`)
      }
    } catch (err) {
      results.failed.push(`❌ 获取网络失败: ${err.message}`)
      console.log(`   ❌ 获取网络失败: ${err.message}`)
    }
  } else {
    results.failed.push('❌ 未检测到钱包扩展')
    console.log('   ❌ 未检测到钱包扩展')
    console.log('   💡 请安装 MetaMask 或其他兼容钱包')
  }

  // 3. 检查全局函数
  console.log('\n3️⃣ 检查全局认证函数...')
  if (typeof window.__zd_admin_refresh === 'function') {
    results.passed.push('✅ 全局认证函数已注册')
    console.log('   ✅ __zd_admin_refresh 函数存在')
  } else {
    results.failed.push('❌ 全局认证函数未注册')
    console.log('   ❌ __zd_admin_refresh 函数不存在')
    console.log('   💡 这可能表示 useEnsureAdminSession Hook 未正确初始化')
  }

  // 4. 检查按钮元素
  console.log('\n4️⃣ 检查页面按钮...')
  const buttons = Array.from(document.querySelectorAll('button'))
  const authButton = buttons.find(btn => btn.textContent.includes('开始认证') || btn.textContent.includes('认证中'))
  const reconnectButton = buttons.find(btn => btn.textContent.includes('重新连接'))
  
  if (authButton) {
    results.passed.push('✅ 找到"开始认证"按钮')
    console.log('   ✅ 找到"开始认证"按钮')
    console.log(`   ℹ️  按钮状态: ${authButton.disabled ? '禁用' : '启用'}`)
    
    if (authButton.disabled) {
      results.warnings.push('⚠️  认证按钮被禁用')
    }
  } else {
    results.warnings.push('⚠️  未找到"开始认证"按钮（可能已认证或不在认证页面）')
    console.log('   ⚠️  未找到"开始认证"按钮')
  }

  if (reconnectButton) {
    results.passed.push('✅ 找到"重新连接"按钮')
    console.log('   ✅ 找到"重新连接"按钮')
  }

  // 5. 检查 API 连接
  console.log('\n5️⃣ 检查 API 连接...')
  try {
    const response = await fetch('/api/auth/is-admin', { cache: 'no-store' })
    const data = await response.json()
    
    if (response.ok) {
      results.passed.push('✅ API 连接正常')
      console.log('   ✅ API 连接正常')
      console.log(`   ℹ️  当前认证状态: ${data.isAdmin ? '已认证' : '未认证'}`)
      
      if (data.isAdmin) {
        results.passed.push('✅ 已有管理员会话')
      }
    } else {
      results.failed.push(`❌ API 返回错误: ${response.status}`)
      console.log(`   ❌ API 返回错误: ${response.status}`)
    }
  } catch (err) {
    results.failed.push(`❌ API 连接失败: ${err.message}`)
    console.log(`   ❌ API 连接失败: ${err.message}`)
  }

  // 6. 检查 React 水合状态
  console.log('\n6️⃣ 检查 React 状态...')
  const rootElement = document.getElementById('__next') || document.querySelector('[data-reactroot]')
  if (rootElement) {
    results.passed.push('✅ React 根元素存在')
    console.log('   ✅ React 根元素存在')
  } else {
    results.failed.push('❌ React 根元素不存在')
    console.log('   ❌ React 根元素不存在')
  }

  // 7. 检查控制台错误
  console.log('\n7️⃣ 检查浏览器环境...')
  console.log(`   ℹ️  浏览器: ${navigator.userAgent}`)
  console.log(`   ℹ️  HTTPS: ${window.location.protocol === 'https:' ? '是' : '否'}`)
  
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    results.warnings.push('⚠️  未使用 HTTPS，钱包连接可能受限')
    console.log('   ⚠️  未使用 HTTPS')
  }

  // 输出总结
  console.log('\n' + '='.repeat(50))
  console.log('📊 诊断总结\n')
  
  console.log(`✅ 通过检查: ${results.passed.length}`)
  results.passed.forEach(msg => console.log(`   ${msg}`))
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  警告: ${results.warnings.length}`)
    results.warnings.forEach(msg => console.log(`   ${msg}`))
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ 失败检查: ${results.failed.length}`)
    results.failed.forEach(msg => console.log(`   ${msg}`))
  }

  console.log('\n' + '='.repeat(50))

  // 提供下一步建议
  console.log('\n💡 下一步建议:\n')
  
  if (results.failed.length === 0 && results.warnings.length === 0) {
    console.log('   ✨ 所有检查都通过！如果仍有问题，请尝试:')
    console.log('   1. 清除浏览器缓存和 Cookie')
    console.log('   2. 重新加载页面')
    console.log('   3. 手动触发认证: window.__zd_admin_refresh()')
  } else if (!window.ethereum) {
    console.log('   1. 安装 MetaMask 或其他兼容钱包扩展')
    console.log('   2. 刷新页面')
  } else if (typeof window.__zd_admin_refresh !== 'function') {
    console.log('   1. 检查浏览器控制台是否有 JavaScript 错误')
    console.log('   2. 确认页面完全加载')
    console.log('   3. 尝试刷新页面')
  } else {
    console.log('   1. 尝试手动触发认证: window.__zd_admin_refresh()')
    console.log('   2. 检查钱包是否已授权当前网站')
    console.log('   3. 确认钱包网络设置正确')
  }

  console.log('\n📝 如需进一步帮助，请将上述诊断结果截图并联系技术支持。')
  console.log('='.repeat(50) + '\n')

  // 返回结果对象供进一步分析
  return {
    passed: results.passed,
    warnings: results.warnings,
    failed: results.failed,
    summary: {
      total: results.passed.length + results.warnings.length + results.failed.length,
      passed: results.passed.length,
      warnings: results.warnings.length,
      failed: results.failed.length
    }
  }
})()


# ABI 说明

此目录用于存放从 Foundry 项目导出的合约 ABI（例如 `Shop.json`）。

导出命令（在 `zeta_shop/` 目录执行）：

```bash
forge inspect src/Shop.sol:Shop abi > ../nextjs-app/lib/abi/Shop.json
```

前端仍可继续使用 `lib/shop.ts` 中的常量 ABI；当合约更新时，建议同步导出 JSON ABI，以便脚本或工具链直接引用。
## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## 部署到 ZetaChain Athens 测试网（7001）

1. 准备环境变量（在 `zeta_shop/.env` 或 shell 中设置）：

```bash
export RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
export PRIVATE_KEY=0x你的私钥 # 切勿提交到仓库
```

2. 校验链 ID（Zeta Athens = 7001），并执行部署脚本：

```bash
forge script script/DeployShop.s.sol:DeployShop \
	--rpc-url $RPC_URL \
	--private-key $PRIVATE_KEY \
	--broadcast \
	--verify --verifier blockscout --verifier-url https://zetachain-athens-3.blockscout.com/api
```

> 说明：
> - `--broadcast` 会实际发送交易；如需 dry-run，可去掉。
> - `--verify` 可选，需确保当前 Blockscout 实例支持验证接口。
> - 如果本地 `.env` 已配置 `ETH_RPC_URL` 与 `PRIVATE_KEY`，可省略对应参数。

3. 将部署地址填入前端环境变量（`nextjs-app/.env.local`）：

```env
NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS=0xDeployedContractAddress
NEXT_PUBLIC_SHOP_CHAIN_ID=7001
```

4. 可选：导出 ABI 到前端（确保 ABI 与部署合约一致）：

```bash
forge inspect src/Shop.sol:Shop abi > ../nextjs-app/lib/abi/Shop.json
```

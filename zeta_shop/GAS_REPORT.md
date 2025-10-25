# Shop Contract Gas Report

Generated on 2025-10-25 via `forge test --gas-report`.

## Deployment
- Deployment cost: `2,730,074` gas
- Deployment size: `12,421` bytes

## Function Costs (gas)
| Function              | Min    | Avg    | Max    | Calls |
|-----------------------|--------|--------|--------|-------|
| `createProduct`       | 162,927 | 163,259 | 165,227 | 7 |
| `setProductStock`     | 26,491 | 30,947 | 35,404 | 2 |
| `toggleProduct`       | 38,833 | 38,833 | 38,833 | 1 |
| `setAdmin`            | 26,170 | 37,126 | 48,082 | 2 |
| `createOrder`         | 169,700 | 175,633 | 194,568 | 5 |
| `payOrder`            | 35,846 | 35,846 | 35,846 | 3 |
| `cancelOrder`         | 42,129 | 42,129 | 42,129 | 1 |
| `refundOrder`         | 76,524 | 76,524 | 76,524 | 1 |
| `updateOrderMetadata` | 31,407 | 39,723 | 51,323 | 3 |
| `withdraw`            | 24,344 | 34,418 | 44,492 | 2 |
| `getProduct`          | 12,956 | 12,956 | 12,956 | 5 |
| `getOrder`            | 15,734 | 15,734 | 15,734 | 6 |

## Notes
- `createOrder` includes stock decrement and order struct initialization; costs vary with storage warm/cold state.
- `payOrder` remains below 36k gas as expected for a simple state + event write.
- Admin mutation functions (`setAdmin`, `setProductStock`, `toggleProduct`) stay sub-50k gas thanks to single-slot updates.
- `refundOrder` covers buyer refund transfer and stock restoration, consuming ~76k gas.

Re-run the report with `cd zeta_shop && forge test --gas-report` after future changes to track regressions.

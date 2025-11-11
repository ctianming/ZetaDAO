import type { Abi } from 'viem'

export const SHOP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SHOP_CONTRACT_ADDRESS || ''
export const SHOP_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_SHOP_CHAIN_ID || process.env.NEXT_PUBLIC_ZETA_CHAIN_ID || '7001'
) // ZetaChain Athens testnet default

export const SHOP_ORDER_STATUSES = [
  'created',
  'paid',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
] as const

export const SHOP_ORDER_STATUS_CODE: Record<(typeof SHOP_ORDER_STATUSES)[number], number> = {
  created: 1,
  paid: 2,
  shipped: 3,
  completed: 4,
  cancelled: 5,
  refunded: 6,
}

export const SHOP_ABI = [
  // --- Added revenue split public vars ---
  {
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [],
  },
  // Versioning helper
  {
    type: 'function',
    name: 'contractVersion',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
  },
  {
    type: 'event',
    name: 'AdminUpdated',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'account', type: 'address' },
      { indexed: false, internalType: 'bool', name: 'enabled', type: 'bool' },
    ],
  },
  {
    type: 'event',
    name: 'OrderCreated',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'productId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'quantity', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'totalPrice', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'metadataHash', type: 'bytes32' },
    ],
  },
  {
    type: 'event',
    name: 'OrderMetadataUpdated',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'metadataHash', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'updater', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'OrderPaid',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OrderStatusChanged',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { indexed: false, internalType: 'uint8', name: 'status', type: 'uint8' },
      { indexed: false, internalType: 'bytes32', name: 'note', type: 'bytes32' },
    ],
  },
  {
    type: 'event',
    name: 'ProductCreated',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'productId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'priceWei', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'stock', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'active', type: 'bool' },
      { indexed: false, internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'ProductStockSet',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'productId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newStock', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ProductUpdated',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'productId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'priceWei', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'stock', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'active', type: 'bool' },
      { indexed: false, internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'Withdraw',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'RevenueAccrued',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'gross', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'shareA', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'shareB', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'RevenueWithdrawn',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'addrA', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'addrB', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountB', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'RevenueConfigUpdated',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'addrA', type: 'address' },
      { indexed: true, internalType: 'address', name: 'addrB', type: 'address' },
      { indexed: false, internalType: 'uint16', name: 'shareA', type: 'uint16' },
      { indexed: false, internalType: 'uint16', name: 'shareB', type: 'uint16' },
    ],
  },
  {
    type: 'function',
    name: 'cancelOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { internalType: 'bytes32', name: 'note', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'createOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'productId', type: 'uint256' },
      { internalType: 'uint64', name: 'quantity', type: 'uint64' },
      { internalType: 'bytes32', name: 'metadataHash', type: 'bytes32' },
    ],
    outputs: [{ internalType: 'uint256', name: 'orderId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'createProduct',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'priceWei', type: 'uint256' },
      { internalType: 'uint256', name: 'initialStock', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ internalType: 'uint256', name: 'productId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getOrder',
    stateMutability: 'view',
    inputs: [{ internalType: 'uint256', name: 'orderId', type: 'uint256' }],
    outputs: [
      {
        internalType: 'struct Shop.Order',
        name: '',
        type: 'tuple',
        components: [
          { internalType: 'uint256', name: 'productId', type: 'uint256' },
          { internalType: 'address', name: 'buyer', type: 'address' },
          { internalType: 'uint64', name: 'quantity', type: 'uint64' },
          { internalType: 'uint256', name: 'unitPrice', type: 'uint256' },
          { internalType: 'uint256', name: 'totalPrice', type: 'uint256' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'uint64', name: 'createdAt', type: 'uint64' },
          { internalType: 'uint64', name: 'updatedAt', type: 'uint64' },
          { internalType: 'bytes32', name: 'metadataHash', type: 'bytes32' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getProduct',
    stateMutability: 'view',
    inputs: [{ internalType: 'uint256', name: 'productId', type: 'uint256' }],
    outputs: [
      {
        internalType: 'struct Shop.Product',
        name: '',
        type: 'tuple',
        components: [
          { internalType: 'uint256', name: 'priceWei', type: 'uint256' },
          { internalType: 'uint256', name: 'stock', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'string', name: 'metadataURI', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'markCompleted',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { internalType: 'bytes32', name: 'note', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'markShipped',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { internalType: 'bytes32', name: 'note', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'nextOrderId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextProductId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'payOrder',
    stateMutability: 'payable',
    inputs: [{ internalType: 'uint256', name: 'orderId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pendingShareA',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'pendingShareB',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'revenueAddrA',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'revenueAddrB',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'shareBP_A',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint16', name: '', type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'shareBP_B',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ internalType: 'uint16', name: '', type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'withdrawRevenue',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getRevenueConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { internalType: 'address', name: 'addrA', type: 'address' },
      { internalType: 'address', name: 'addrB', type: 'address' },
      { internalType: 'uint16', name: 'shareA', type: 'uint16' },
      { internalType: 'uint16', name: 'shareB', type: 'uint16' },
    ],
  },
  {
    type: 'function',
    name: 'setRevenueConfig',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'address', name: 'addrA', type: 'address' },
      { internalType: 'address', name: 'addrB', type: 'address' },
      { internalType: 'uint16', name: 'shareA', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'refundOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { internalType: 'bytes32', name: 'note', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setAdmin',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'bool', name: 'enabled', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setProductStock',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'productId', type: 'uint256' },
      { internalType: 'uint256', name: 'newStock', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'toggleProduct',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'productId', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferOwnership',
    stateMutability: 'nonpayable',
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateOrderMetadata',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'orderId', type: 'uint256' },
      { internalType: 'bytes32', name: 'metadataHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateProduct',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'uint256', name: 'productId', type: 'uint256' },
      { internalType: 'uint256', name: 'priceWei', type: 'uint256' },
      { internalType: 'uint256', name: 'stock', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
      { internalType: 'string', name: 'metadataURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { internalType: 'address payable', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'receive',
    stateMutability: 'payable',
  },
] as const satisfies Abi

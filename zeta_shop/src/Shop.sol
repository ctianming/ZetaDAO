// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Zeta Shop - On-chain product catalog and order settlement for ZetaDAO merchandise
contract Shop {
    /// --------------------
    /// Types & Storage
    /// --------------------

    enum OrderStatus { None, Created, Paid, Shipped, Completed, Cancelled, Refunded }

    struct Product {
        uint256 priceWei;
        uint256 stock;
        bool active;
        string metadataURI;
    }

    struct Order {
        uint256 productId;
        address buyer;
        uint64 quantity;
        uint256 unitPrice;
        uint256 totalPrice;
        OrderStatus status;
        uint64 createdAt;
        uint64 updatedAt;
        bytes32 metadataHash; // off-chain shipping/contact info hash
    }

    address public owner;
    // Configurable revenue split recipients & basis points (shareA in [0,10000], shareB = 10000-shareA)
    address public revenueAddrA;
    address public revenueAddrB;
    uint16 public shareBP_A; // basis points (parts per 10_000)
    uint16 public shareBP_B; // derived
    // Pending undistributed revenue shares kept in contract to allow potential refunds before withdrawal
    uint256 public pendingShareA;
    uint256 public pendingShareB;
    uint256 public nextProductId;
    uint256 public nextOrderId;

    mapping(uint256 => Product) private _products;
    mapping(uint256 => Order) private _orders;
    mapping(uint256 => bool) private _productExists;
    mapping(address => bool) private _admins;

    bool private _locked; // simple reentrancy guard for value-transferring flows

    /// --------------------
    /// Events
    /// --------------------

    event ProductCreated(uint256 indexed productId, uint256 priceWei, uint256 stock, bool active, string metadataURI);
    event ProductUpdated(uint256 indexed productId, uint256 priceWei, uint256 stock, bool active, string metadataURI);
    event ProductStockSet(uint256 indexed productId, uint256 newStock);

    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed productId,
        address indexed buyer,
        uint256 quantity,
        uint256 totalPrice,
        bytes32 metadataHash
    );
    event OrderPaid(uint256 indexed orderId, address indexed buyer, uint256 amount);
    event OrderMetadataUpdated(uint256 indexed orderId, bytes32 metadataHash, address indexed updater);
    event OrderStatusChanged(uint256 indexed orderId, OrderStatus status, bytes32 note);
    event Withdraw(address indexed to, uint256 amount);
    event AdminUpdated(address indexed account, bool enabled);
    event RevenueAccrued(uint256 indexed orderId, uint256 gross, uint256 shareA, uint256 shareB);
    event RevenueWithdrawn(address indexed addrA, uint256 amountA, address indexed addrB, uint256 amountB);
    event RevenueConfigUpdated(address indexed addrA, address indexed addrB, uint16 shareA, uint16 shareB);

    /// --------------------
    /// Errors
    /// --------------------

    error NotOwner();
    error InvalidProduct();
    error InvalidOrder();
    error InvalidQuantity();
    error NotActive();
    error StockUnavailable();
    error NotBuyer();
    error InvalidStatus();
    error PaymentAmountMismatch();
    error TransferFailed();
    error Unauthorized();

    /// --------------------
    /// Modifiers
    /// --------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAdmin() {
        if (!_isAdmin(msg.sender)) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert TransferFailed();
        _locked = true;
        _;
        _locked = false;
    }

    /// --------------------
    /// Constructor
    /// --------------------

    constructor() {
        owner = msg.sender;
        // initialize default 20/80 split using provided addresses (can be updated later)
        revenueAddrA = 0x1358bFAC4032C2ff79e50e132840F33f7f709D89;
        revenueAddrB = 0x6cD6592b7D2A9b1E59AA60a6138434d2fE4CD062;
        shareBP_A = 2000; // 20%
        shareBP_B = 8000; // 80%
        emit RevenueConfigUpdated(revenueAddrA, revenueAddrB, shareBP_A, shareBP_B);
    }

    /// --------------------
    /// Revenue config management
    /// --------------------
    error InvalidRevenueConfig();
    error RevenuePending(); // cannot change config while pending shares exist to avoid accounting complexity

    function setRevenueConfig(address addrA, address addrB, uint16 shareA) external onlyOwner {
        if (pendingShareA + pendingShareB != 0) revert RevenuePending();
        if (addrA == address(0) || addrB == address(0)) revert InvalidRevenueConfig();
        if (shareA > 10000) revert InvalidRevenueConfig();
        revenueAddrA = addrA;
        revenueAddrB = addrB;
        shareBP_A = shareA;
        shareBP_B = uint16(10000 - shareA);
        emit RevenueConfigUpdated(addrA, addrB, shareBP_A, shareBP_B);
    }

    function getRevenueConfig() external view returns (address addrA, address addrB, uint16 shareA, uint16 shareB) {
        return (revenueAddrA, revenueAddrB, shareBP_A, shareBP_B);
    }

    /// --------------------
    /// Admin management
    /// --------------------

    function setAdmin(address account, bool enabled) external onlyOwner {
        if (account == address(0)) revert Unauthorized();
        _admins[account] = enabled;
        emit AdminUpdated(account, enabled);
    }

    /// --------------------
    /// Product management
    /// --------------------

    function createProduct(
        uint256 priceWei,
        uint256 initialStock,
        bool active,
        string calldata metadataURI
    ) external onlyAdmin returns (uint256 productId) {
        productId = ++nextProductId;
        _products[productId] = Product({
            priceWei: priceWei,
            stock: initialStock,
            active: active,
            metadataURI: metadataURI
        });
        _productExists[productId] = true;
        emit ProductCreated(productId, priceWei, initialStock, active, metadataURI);
    }

    function updateProduct(
        uint256 productId,
        uint256 priceWei,
        uint256 stock,
        bool active,
        string calldata metadataURI
    ) external onlyAdmin {
        Product storage product = _product(productId);
        product.priceWei = priceWei;
        product.stock = stock;
        product.active = active;
        product.metadataURI = metadataURI;
        emit ProductUpdated(productId, priceWei, stock, active, metadataURI);
    }

    function setProductStock(uint256 productId, uint256 newStock) external onlyAdmin {
        Product storage product = _product(productId);
        product.stock = newStock;
        emit ProductStockSet(productId, newStock);
    }

    function toggleProduct(uint256 productId, bool active) external onlyAdmin {
        Product storage product = _product(productId);
        product.active = active;
        emit ProductUpdated(productId, product.priceWei, product.stock, active, product.metadataURI);
    }

    /// --------------------
    /// Order lifecycle
    /// --------------------

    function createOrder(
        uint256 productId,
        uint64 quantity,
        bytes32 metadataHash
    ) external returns (uint256 orderId) {
        if (quantity == 0) revert InvalidQuantity();
        Product storage product = _product(productId);
        if (!product.active) revert NotActive();
        if (product.stock < quantity) revert StockUnavailable();

        product.stock -= quantity;

        orderId = ++nextOrderId;
        uint256 totalPrice = product.priceWei * quantity;
        _orders[orderId] = Order({
            productId: productId,
            buyer: msg.sender,
            quantity: quantity,
            unitPrice: product.priceWei,
            totalPrice: totalPrice,
            status: OrderStatus.Created,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            metadataHash: metadataHash
        });

        emit OrderCreated(orderId, productId, msg.sender, quantity, totalPrice, metadataHash);
    }

    function updateOrderMetadata(uint256 orderId, bytes32 metadataHash) external {
        Order storage order = _order(orderId);
    if (msg.sender != order.buyer && !_isAdmin(msg.sender)) revert Unauthorized();
        order.metadataHash = metadataHash;
        order.updatedAt = uint64(block.timestamp);
        emit OrderMetadataUpdated(orderId, metadataHash, msg.sender);
    }

    function payOrder(uint256 orderId) external payable nonReentrant {
        Order storage order = _order(orderId);
        if (order.status != OrderStatus.Created) revert InvalidStatus();
        if (msg.sender != order.buyer) revert NotBuyer();
        if (msg.value != order.totalPrice) revert PaymentAmountMismatch();

        order.status = OrderStatus.Paid;
        order.updatedAt = uint64(block.timestamp);

        // Accrue revenue shares (not immediately transferred to keep refund capability)
    uint256 shareA = (msg.value * shareBP_A) / 10000;
    uint256 shareB = msg.value - shareA; // remainder
        pendingShareA += shareA;
        pendingShareB += shareB;

        emit OrderPaid(orderId, msg.sender, msg.value);
        emit RevenueAccrued(orderId, msg.value, shareA, shareB);
        emit OrderStatusChanged(orderId, OrderStatus.Paid, bytes32(0));
    }

    function cancelOrder(uint256 orderId, bytes32 note) external {
        Order storage order = _order(orderId);
        if (order.status != OrderStatus.Created) revert InvalidStatus();
    if (msg.sender != order.buyer && !_isAdmin(msg.sender)) revert Unauthorized();

        order.status = OrderStatus.Cancelled;
        order.updatedAt = uint64(block.timestamp);

        Product storage product = _product(order.productId);
        product.stock += order.quantity;

        emit OrderStatusChanged(orderId, OrderStatus.Cancelled, note);
    }

    function markShipped(uint256 orderId, bytes32 note) external onlyAdmin {
        Order storage order = _order(orderId);
        if (order.status != OrderStatus.Paid) revert InvalidStatus();
        order.status = OrderStatus.Shipped;
        order.updatedAt = uint64(block.timestamp);
        emit OrderStatusChanged(orderId, OrderStatus.Shipped, note);
    }

    function markCompleted(uint256 orderId, bytes32 note) external onlyAdmin {
        Order storage order = _order(orderId);
        if (order.status != OrderStatus.Shipped) revert InvalidStatus();
        order.status = OrderStatus.Completed;
        order.updatedAt = uint64(block.timestamp);
        emit OrderStatusChanged(orderId, OrderStatus.Completed, note);
    }

    function refundOrder(uint256 orderId, bytes32 note) external onlyAdmin nonReentrant {
        Order storage order = _order(orderId);
        if (order.status != OrderStatus.Paid) revert InvalidStatus();

        order.status = OrderStatus.Refunded;
        order.updatedAt = uint64(block.timestamp);

        Product storage product = _product(order.productId);
        product.stock += order.quantity;

        // Adjust pending shares (proportional rollback)
    uint256 shareA = (order.totalPrice * shareBP_A) / 10000;
    uint256 shareB = order.totalPrice - shareA;
        if (pendingShareA >= shareA) pendingShareA -= shareA; else pendingShareA = 0; // defensive
        if (pendingShareB >= shareB) pendingShareB -= shareB; else pendingShareB = 0;

        (bool ok, ) = payable(order.buyer).call{value: order.totalPrice}("");
        if (!ok) revert TransferFailed();

        emit OrderStatusChanged(orderId, OrderStatus.Refunded, note);
    }

    /// --------------------
    /// View helpers
    /// --------------------

    function getProduct(uint256 productId) external view returns (Product memory) {
        if (!_productExists[productId]) revert InvalidProduct();
        return _products[productId];
    }

    function getOrder(uint256 orderId) external view returns (Order memory) {
        Order memory order = _orders[orderId];
        if (order.status == OrderStatus.None) revert InvalidOrder();
        return order;
    }

    /// --------------------
    /// Treasury management
    /// --------------------

    function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        // Legacy direct withdraw (avoids touching pending shares) - kept for emergency / migration
        if (to == address(0)) to = payable(owner);
        uint256 distributable = address(this).balance - (pendingShareA + pendingShareB);
        uint256 value = amount == 0 || amount > distributable ? distributable : amount;
        (bool ok, ) = to.call{value: value}("");
        if (!ok) revert TransferFailed();
        emit Withdraw(to, value);
    }

    /// @notice Withdraw accumulated revenue shares to predefined addresses
    function withdrawRevenue() external onlyOwner nonReentrant {
        uint256 amountA = pendingShareA;
        uint256 amountB = pendingShareB;
        pendingShareA = 0;
        pendingShareB = 0;
        if (amountA > 0) {
            (bool okA, ) = revenueAddrA.call{value: amountA}("");
            if (!okA) revert TransferFailed();
        }
        if (amountB > 0) {
            (bool okB, ) = revenueAddrB.call{value: amountB}("");
            if (!okB) revert TransferFailed();
        }
        emit RevenueWithdrawn(revenueAddrA, amountA, revenueAddrB, amountB);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        owner = newOwner;
    }

    receive() external payable {}

    /// --------------------
    /// Versioning
    /// --------------------
    function contractVersion() external pure returns (string memory) {
        return "1.2.0";
    }

    /// --------------------
    /// Internal helpers
    /// --------------------

    function _product(uint256 productId) private view returns (Product storage product) {
        if (!_productExists[productId]) revert InvalidProduct();
        return _products[productId];
    }

    function _order(uint256 orderId) private view returns (Order storage order) {
        order = _orders[orderId];
        if (order.status == OrderStatus.None) revert InvalidOrder();
    }

    function _isAdmin(address account) private view returns (bool) {
        return account == owner || _admins[account];
    }
}

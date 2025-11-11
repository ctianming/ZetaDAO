// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Shop} from "../src/Shop.sol";

contract ShopTest is Test {
    Shop shop;
    address owner = address(0xA11CE);
    address buyer = address(0xB0B);
    address manager = address(0xCAFE);

    function setUp() public {
        vm.prank(owner);
        shop = new Shop();
    }

    function testCreateProduct() public {
        vm.prank(owner);
        uint256 productId = shop.createProduct(1 ether, 5, true, "ipfs://product/1");

        Shop.Product memory product = shop.getProduct(productId);
        assertEq(product.priceWei, 1 ether, "price");
        assertEq(product.stock, 5, "stock");
        assertTrue(product.active, "active");
        assertEq(product.metadataURI, "ipfs://product/1", "metadata");
    }

    function testCreateOrderAndPay() public {
        uint256 productId = _createProduct(2 ether, 3);

        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 2, bytes32("order-metadata"));

        Shop.Order memory order = shop.getOrder(orderId);
        assertEq(order.totalPrice, 4 ether, "total");
        assertEq(order.quantity, 2, "qty");
        assertEq(order.metadataHash, bytes32("order-metadata"), "metadata");

        vm.prank(buyer);
        vm.expectEmit(true, true, false, true);
        emit Shop.OrderPaid(orderId, buyer, 4 ether);
        shop.payOrder{value: 4 ether}(orderId);

        order = shop.getOrder(orderId);
        assertEq(uint256(order.status), uint256(Shop.OrderStatus.Paid), "status");

        Shop.Product memory product = shop.getProduct(productId);
        assertEq(product.stock, 1, "stock should decrease");
    }

    function testCancelRestoresStock() public {
        uint256 productId = _createProduct(1 ether, 2);

        vm.deal(buyer, 5 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));

        vm.prank(buyer);
        shop.cancelOrder(orderId, bytes32("user-cancel"));

        Shop.Order memory order = shop.getOrder(orderId);
        assertEq(uint256(order.status), uint256(Shop.OrderStatus.Cancelled));

        Shop.Product memory product = shop.getProduct(productId);
        assertEq(product.stock, 2, "stock restored");
    }

    function testRefundOrder() public {
        uint256 productId = _createProduct(1 ether, 1);

        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));

        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);

        assertEq(address(shop).balance, 1 ether, "treasury");

        vm.prank(owner);
        shop.refundOrder(orderId, bytes32("refund"));

        Shop.Order memory order = shop.getOrder(orderId);
        assertEq(uint256(order.status), uint256(Shop.OrderStatus.Refunded));
        assertEq(address(shop).balance, 0);
        assertEq(buyer.balance, 2 ether, "buyer refunded");

        Shop.Product memory product = shop.getProduct(productId);
        assertEq(product.stock, 1, "stock restored after refund");
    }

    function testOnlyOwnerCanWithdrawAndRevenueFlow() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);

        // Non-owner cannot use withdraw
        vm.expectRevert(Shop.NotOwner.selector);
        vm.prank(buyer);
        shop.withdraw(payable(buyer), 1 ether);

        // Owner withdraw (legacy) cannot take pending revenue
        vm.prank(owner);
        shop.withdraw(payable(owner), 0);
        // balance still equals total pending
        assertEq(address(shop).balance, 1 ether, "pending remains");

        // Owner should use withdrawRevenue to distribute
        uint256 balBeforeA = address(shop.revenueAddrA()).balance;
        uint256 balBeforeB = address(shop.revenueAddrB()).balance;
        vm.prank(owner);
        shop.withdrawRevenue();
        assertEq(address(shop).balance, 0, "treasury drained after revenue withdraw");
        assertEq(address(shop.revenueAddrA()).balance, balBeforeA + 0.2 ether);
        assertEq(address(shop.revenueAddrB()).balance, balBeforeB + 0.8 ether);
    }

    function testUpdateOrderMetadataAuthorized() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));

        // buyer updates metadata
        vm.prank(buyer);
    shop.updateOrderMetadata(orderId, keccak256(bytes("user")));
        Shop.Order memory order = shop.getOrder(orderId);
    assertEq(order.metadataHash, keccak256(bytes("user")));

        // owner overrides metadata
        vm.prank(owner);
    shop.updateOrderMetadata(orderId, keccak256(bytes("owner")));
        order = shop.getOrder(orderId);
    assertEq(order.metadataHash, keccak256(bytes("owner")));

        // random address forbidden
    address stranger = address(0xDEAD);
        vm.prank(stranger);
        vm.expectRevert(Shop.Unauthorized.selector);
    shop.updateOrderMetadata(orderId, keccak256(bytes("stranger")));
    }

    function testAdminRoleCanManageProducts() public {
        vm.prank(owner);
        shop.setAdmin(manager, true);

        vm.prank(manager);
        uint256 productId = shop.createProduct(1 ether, 10, true, "ipfs://admin-product");

        vm.prank(manager);
        shop.setProductStock(productId, 7);

        vm.prank(manager);
        shop.toggleProduct(productId, false);

        Shop.Product memory product = shop.getProduct(productId);
        assertEq(product.stock, 7);
        assertFalse(product.active);

        // revoke admin and ensure access removed
        vm.prank(owner);
        shop.setAdmin(manager, false);

        vm.prank(manager);
        vm.expectRevert(Shop.Unauthorized.selector);
        shop.setProductStock(productId, 5);
    }

    function testShipAndCompleteFlow() public {
        uint256 productId = _createProduct(1 ether, 2);
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, keccak256(bytes("meta")));

        // pay
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);
        Shop.Order memory order = shop.getOrder(orderId);
        assertEq(uint256(order.status), uint256(Shop.OrderStatus.Paid));

        // owner as admin (owner is admin by default)
        vm.prank(owner);
        shop.markShipped(orderId, keccak256(bytes("ship")));
        order = shop.getOrder(orderId);
        assertEq(uint256(order.status), uint256(Shop.OrderStatus.Shipped));

        vm.prank(owner);
        shop.markCompleted(orderId, keccak256(bytes("done")));
        order = shop.getOrder(orderId);
        assertEq(uint256(order.status), uint256(Shop.OrderStatus.Completed));
    }

    function testCreateOrderInvalidQuantity() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.prank(buyer);
        vm.expectRevert(Shop.InvalidQuantity.selector);
        shop.createOrder(productId, 0, bytes32(0));
    }

    function testCreateOrderNotActive() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.prank(owner);
        shop.toggleProduct(productId, false);
        vm.prank(buyer);
        vm.expectRevert(Shop.NotActive.selector);
        shop.createOrder(productId, 1, bytes32(0));
    }

    function testCreateOrderStockUnavailable() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.prank(buyer);
        vm.expectRevert(Shop.StockUnavailable.selector);
        shop.createOrder(productId, 2, bytes32(0));
    }

    function testPayOrderWrongSender() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        // manager tries to pay
        vm.deal(manager, 1 ether);
        vm.prank(manager);
        vm.expectRevert(Shop.NotBuyer.selector);
        shop.payOrder{value: 1 ether}(orderId);
    }

    function testPayOrderWrongAmount() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        vm.expectRevert(Shop.PaymentAmountMismatch.selector);
        shop.payOrder{value: 2 ether}(orderId);
    }

    function testCancelAfterPaidReverts() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);
        vm.prank(buyer);
        vm.expectRevert(Shop.InvalidStatus.selector);
        shop.cancelOrder(orderId, bytes32("n/a"));
    }

    function testMarkShippedInvalidStatus() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(owner);
        vm.expectRevert(Shop.InvalidStatus.selector);
        shop.markShipped(orderId, bytes32("n/a"));
    }

    function testMarkCompletedInvalidStatus() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);
        // directly complete without shipped
        vm.prank(owner);
        vm.expectRevert(Shop.InvalidStatus.selector);
        shop.markCompleted(orderId, bytes32("n/a"));
    }

    function testRefundInvalidStatus() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(owner);
        vm.expectRevert(Shop.InvalidStatus.selector);
        shop.refundOrder(orderId, bytes32("n/a"));
    }

    function testSetAdminZeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(Shop.Unauthorized.selector);
        shop.setAdmin(address(0), true);
    }

    function testGetInvalidProductAndOrderRevert() public {
        vm.expectRevert(Shop.InvalidProduct.selector);
        shop.getProduct(999);
        vm.expectRevert(Shop.InvalidOrder.selector);
        shop.getOrder(888);
    }

    function testContractVersion() public {
        (bool ok, bytes memory data) = address(shop).staticcall(abi.encodeWithSignature("contractVersion()"));
        assertTrue(ok, "version call");
        string memory ver = abi.decode(data, (string));
        assertEq(ver, "1.2.0", "version should be 1.2.0");
    }

    function testRevenueDefaultConfig() public {
        (address a, address b, uint16 shareA, uint16 shareB) = shop.getRevenueConfig();
        assertEq(shareA, 2000, "default shareA 20%");
        assertEq(shareB, 8000, "default shareB 80%");
        assertTrue(a != address(0) && b != address(0), "addresses set");
    }

    function testRevenueAccrualAndWithdraw() public {
        uint256 productId = _createProduct(1 ether, 2);
        vm.deal(buyer, 5 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32("meta"));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);
        // pending shares reflect 20/80 split
        assertEq(shop.pendingShareA(), 0.2 ether, "pending A");
        assertEq(shop.pendingShareB(), 0.8 ether, "pending B");
        uint256 balBeforeA = address(shop.revenueAddrA()).balance;
        uint256 balBeforeB = address(shop.revenueAddrB()).balance;
        vm.prank(owner);
        shop.withdrawRevenue();
        assertEq(shop.pendingShareA(), 0, "pending A zero");
        assertEq(shop.pendingShareB(), 0, "pending B zero");
        assertEq(address(shop.revenueAddrA()).balance, balBeforeA + 0.2 ether, "addrA received");
        assertEq(address(shop.revenueAddrB()).balance, balBeforeB + 0.8 ether, "addrB received");
    }

    function testRevenueConfigCannotChangeWhilePending() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);
        vm.prank(owner);
        vm.expectRevert(Shop.RevenuePending.selector);
        shop.setRevenueConfig(address(0x1), address(0x2), 3000);
    }

    function testRevenueConfigUpdate() public {
        // withdraw any pending first (none initially)
        vm.prank(owner);
        shop.setRevenueConfig(address(0xAAA1), address(0xBBB2), 2500); // 25% / 75%
        (address a, address b, uint16 shareA, uint16 shareB) = shop.getRevenueConfig();
        assertEq(a, address(0xAAA1), "addrA updated");
        assertEq(b, address(0xBBB2), "addrB updated");
        assertEq(shareA, 2500, "shareA 25%");
        assertEq(shareB, 7500, "shareB 75%");
    }

    function testRevenueRefundRollsBackPending() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);
        assertEq(shop.pendingShareA(), 0.2 ether, "pending A before refund");
        vm.prank(owner);
        shop.refundOrder(orderId, bytes32("refund"));
        assertEq(shop.pendingShareA(), 0, "pending A after refund");
        assertEq(shop.pendingShareB(), 0, "pending B after refund");
    }

    function testRevenueInvalidConfig() public {
        vm.prank(owner);
        vm.expectRevert(Shop.InvalidRevenueConfig.selector);
        shop.setRevenueConfig(address(0), address(0x1234), 1000);
        vm.prank(owner);
        vm.expectRevert(Shop.InvalidRevenueConfig.selector);
        shop.setRevenueConfig(address(0x1234), address(0), 1000);
        vm.prank(owner);
        vm.expectRevert(Shop.InvalidRevenueConfig.selector);
        shop.setRevenueConfig(address(0x1234), address(0x5678), 10001); // shareA > 10000
    }

    function testTransferOwnership() public {
        // prepare funds via a product & order first
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);

        // Pending revenue should exist (1 ether split 20/80)
        assertEq(shop.pendingShareA(), 0.2 ether, "pending A before transfer");
        assertEq(shop.pendingShareB(), 0.8 ether, "pending B before transfer");

        // transfer ownership to new manager
        vm.prank(owner);
        shop.transferOwnership(manager);

        // old owner cannot withdraw
        vm.prank(owner);
        vm.expectRevert(Shop.NotOwner.selector);
        shop.withdraw(payable(owner), 0);

        // new owner withdrawRevenue distributes funds
        uint256 balBeforeA = address(shop.revenueAddrA()).balance;
        uint256 balBeforeB = address(shop.revenueAddrB()).balance;
        vm.prank(manager);
        shop.withdrawRevenue();
        assertEq(address(shop).balance, 0, "treasury empty after distribution");
        assertEq(address(shop.revenueAddrA()).balance, balBeforeA + 0.2 ether, "addrA received");
        assertEq(address(shop.revenueAddrB()).balance, balBeforeB + 0.8 ether, "addrB received");
        assertEq(shop.pendingShareA(), 0, "pending A cleared");
        assertEq(shop.pendingShareB(), 0, "pending B cleared");
    }

    function testNextIdsIncrement() public {
        uint256 id1 = _createProduct(1 ether, 1);
        uint256 id2 = _createProduct(2 ether, 2);
        assertEq(id1 + 1, id2, "product id increments");

        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        uint256 o1 = shop.createOrder(id1, 1, bytes32(0));
        vm.prank(buyer);
        uint256 o2 = shop.createOrder(id2, 1, bytes32(0));
        assertEq(o1 + 1, o2, "order id increments");
    }

    /// --------------------
    /// Helpers
    /// --------------------

    function _createProduct(uint256 priceWei, uint256 stock) internal returns (uint256 productId) {
        vm.prank(owner);
        productId = shop.createProduct(priceWei, stock, true, "ipfs://product");
    }
}

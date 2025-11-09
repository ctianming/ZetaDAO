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

    function testOnlyOwnerCanWithdraw() public {
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);

        vm.expectRevert(Shop.NotOwner.selector);
        vm.prank(buyer);
        shop.withdraw(payable(buyer), 1 ether);

        vm.prank(owner);
        shop.withdraw(payable(owner), 0);
        assertEq(address(shop).balance, 0);
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
        // sanity check version string exists
        // We cannot call pure view returning string via interface easily in foundry's assert,
        // but we can compare hash for stability.
        (bool ok, bytes memory data) = address(shop).staticcall(abi.encodeWithSignature("contractVersion()"));
        assertTrue(ok, "version call");
        string memory ver = abi.decode(data, (string));
        assertEq(keccak256(bytes(ver)), keccak256(bytes("1.0.0")), "version");
    }

    function testTransferOwnership() public {
        // prepare funds via a product & order first
        uint256 productId = _createProduct(1 ether, 1);
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        uint256 orderId = shop.createOrder(productId, 1, bytes32(0));
        vm.prank(buyer);
        shop.payOrder{value: 1 ether}(orderId);

        // transfer ownership to new manager
        vm.prank(owner);
        shop.transferOwnership(manager);

        vm.prank(owner);
        vm.expectRevert(Shop.NotOwner.selector);
        shop.withdraw(payable(owner), 0);

        // new owner can withdraw
        vm.prank(manager);
        shop.withdraw(payable(manager), 0);
        assertEq(address(shop).balance, 0);
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

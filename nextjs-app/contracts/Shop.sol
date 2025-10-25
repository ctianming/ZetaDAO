// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Shop {
    event OrderPaid(uint256 orderId, address indexed buyer, uint256 amount);

    mapping(uint256 => bool) public processed;

    function purchase(uint256 orderId) external payable {
        require(msg.value > 0, "No value");
        require(!processed[orderId], "Order already paid");
        processed[orderId] = true;
        emit OrderPaid(orderId, msg.sender, msg.value);
    }
}

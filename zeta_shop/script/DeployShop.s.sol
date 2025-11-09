// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Shop} from "../src/Shop.sol";

/// @notice Deploy Shop contract to a configured network (e.g., ZetaChain Athens testnet 7001)
contract DeployShop is Script {
    function run() external {
        // Read private key from env (forge automatically loads .env)
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        Shop shop = new Shop();
        vm.stopBroadcast();

        console2.log("Shop deployed at:", address(shop));
        console2.log("Version:", shop.contractVersion());
    }
}

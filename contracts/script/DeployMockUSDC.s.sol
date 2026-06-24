// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ScreenTimeChallenge.sol";

contract DeployMockUSDCScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();

        // Mint 1000 USDC to deployer for testing
        usdc.mint(deployer, 1000e6);

        console.log("MockUSDC:", address(usdc));
        console.log("Minted 1000 USDC to:", deployer);

        vm.stopBroadcast();
    }
}

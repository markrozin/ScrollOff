// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ScreenTimeChallenge.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address reporter = vm.envAddress("REPORTER_ADDRESS");

        // Base mainnet USDC
        address usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

        vm.startBroadcast(deployerKey);

        ScreenTimeChallenge challenge = new ScreenTimeChallenge(usdc, reporter);

        console.log("ScreenTimeChallenge deployed at:", address(challenge));
        console.log("USDC:", usdc);
        console.log("Reporter:", reporter);

        vm.stopBroadcast();
    }
}

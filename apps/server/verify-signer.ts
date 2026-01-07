
import { contractService } from './src/contractService.js'; // Note .js extension for execution

async function main() {
    console.log('🔍 Verifying Server <-> Blockchain Connection...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for config load

    const result = await contractService.verifySigner();

    if (result) {
        console.log('\n✅ Verification Result:');
        console.log(`Server Wallet Key: ${result.serverAddress}`);
        console.log(`Smart Contract Authorized Signer: ${result.contractSigner}`);

        if (result.isMatch) {
            console.log('\n🎉 SUCCESS! Your server is authorized to handle payments.');
        } else {
            console.log('\n❌ MISMATCH ERROR!');
            console.log('The PRIVATE_KEY in your .env does not belong to the authorized backendSigner.');
            console.log('Action: Either update .env with the correct key, or update the smart contract.');
        }
    } else {
        console.log('\n❌ Configuration Error: Could not connect to contract. Check RPC_URL and Address.');
    }
    process.exit(0);
}

main();

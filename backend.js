;;;;;// Update imports
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const contractABI = require('./artifacts/contracts/Voting.sol/Voting.json').abi;
const contractAddress = process.env.CONTRACT_ADDRESS;
const Voter = require('./voterModel');

const app = express();

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(cors());
app.use(bodyParser.json());

console.log('\n🔄 Server restarting...');
console.log('=======================================');

console.log('🚀 Starting Ethereum connection setup...');
console.log('📡 Setting up provider for network:', 'http://127.0.0.1:8545');
const provider = ethers.getDefaultProvider('http://127.0.0.1:8545');

console.log('🔑 Initializing wallet...');
const privateKey = process.env.METAMASK_ACCOUNT_PRIVATE_KEY;
console.log('Private key length:', privateKey?.length || 'undefined');
const wallet = new ethers.Wallet(privateKey, provider);

console.log('📄 Setting up smart contract...');
console.log('Contract address:', contractAddress);
console.log('ABI loaded:', Boolean(contractABI));
if (!contractABI) {
    console.error('❌ Contract ABI is missing or invalid');
    process.exit(1);
}
if (!contractAddress) {
    console.error('❌ Contract address is missing');
    process.exit(1);
}
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

const checkConnection = async () => {
    try {
        console.log('🔍 Checking network connection...');
        const network = await provider.getNetwork();
        console.log('Network details:', {
            name: network.name,
            chainId: network.chainId,
            ensAddress: network.ensAddress
        });
        const balance = await provider.getBalance(wallet.address);
        console.log('Wallet balance:', ethers.utils.formatEther(balance), 'ETH');
        console.log('✅ Successfully connected to Ethereum network');
    } catch (err) {
        console.error('❌ Connection error details:');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Stack trace:', err.stack);
        process.exit(1);
    }
};

const initialize = async () => {
    try {
        await checkConnection();
        console.log('Default account set:', wallet.address);
    } catch (error) {
        console.error('Initialization error:', error.message);
    }
};

initialize();

app.post('/register', async (req, res) => {
    const { username, accountNumber, constituency, signature } = req.body;
    try {
        if (!username || !accountNumber || !constituency || !signature) {
            throw new Error('Username, account number, constituency, and signature are required');
        }

        const formattedHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(accountNumber));

        const existingVoter = await Voter.findOne({ accountNumberHash: formattedHash });
        if (existingVoter) {
            throw new Error('Account number hash is already registered');
        }

        try {
            const estimatedGas = await contract.estimateGas.registerVoter(constituency, formattedHash, signature);
            const tx = await contract.registerVoter(constituency, formattedHash, signature, {
                gasLimit: estimatedGas.add(3000)
            });
            await tx.wait();
        } catch (err) {
            console.error("🚨 Gas estimation or transaction failed:", err);
            throw err;
        }

        await new Voter({ username, accountNumberHash: formattedHash, constituency }).save();

        res.json({ message: 'Voter registered successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// The rest of the code remains unchanged...
// Update vote endpoint
app.post('/vote', async (req, res) => {
    const { address, candidateName } = req.body;
    try {
        if (!ethers.utils.isAddress(address) || !candidateName) {
            throw new Error('Invalid address or candidate name');
        }

        const voter = await Voter.findOne({ address });
        if (!voter) {
            throw new Error('Voter is not registered');
        }

        const candidates = await contract.getCandidateList();
        if (!candidates.includes(candidateName)) {
            throw new Error('Candidate does not exist');
        }

        const estimatedGas = await contract.estimateGas.castVote(candidateName);
        const tx = await contract.castVote(candidateName, {
            gasLimit: estimatedGas.mul(120).div(100)
        });
        await tx.wait();

        voter.hasVoted = true;
        await voter.save();

        res.json({ message: 'Vote cast successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update candidates endpoint
app.get('/candidates', async (req, res) => {
    try {
        const candidates = await contract.getCandidateList();
        res.json(candidates);
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update add-candidate endpoint
app.post('/add-candidate', async (req, res) => {
    const { candidateName } = req.body;
    try {
        if (!candidateName) {
            throw new Error('Candidate name is required');
        }

        const tx = await contract.addCandidate(candidateName);
        await tx.wait();

        res.json({ message: `Candidate ${candidateName} registered successfully` });
    } catch (error) {
        console.error('Add candidate error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/test-contract', async (req, res) => {
    try {
        const code = await provider.getCode(contractAddress);
        if(code === '0x') {
            throw new Error('Contract not found at specified address');
        }
        res.json({ 
            status: 'Contract found',
            address: contractAddress,
            bytecode: code
        });
    } catch (error) {
        console.error('Contract test error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add this near your other endpoints
app.get('/health', async (req, res) => {
    try {
        const network = await provider.getNetwork();
        const balance = await provider.getBalance(wallet.address);
        
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            ethereum: {
                connected: true,
                network: network.name,
                chainId: network.chainId,
                walletAddress: wallet.address,
                balance: ethers.utils.formatEther(balance)
            },
            mongodb: {
                connected: mongoose.connection.readyState === 1
            },
            contract: {
                address: contractAddress,
                deployed: Boolean(contractAddress)
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// Add graceful shutdown handlers
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit();
});

// Add server listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}`);
    console.log('=======================================');
});

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const Web3 = require('web3');
const contractABI = require('./contractABI.json');
const contractAddress = process.env.CONTRACT_ADDRESS;
const Voter = require('./voterModel');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Remove this duplicate schema definition
// const voterSchema = new mongoose.Schema({
//     address: { type: String, required: true, unique: true },
//     isRegistered: { type: Boolean, default: false },
//     hasVoted: { type: Boolean, default: false },
// });
// const VoterModel = mongoose.model('Voter', voterSchema);

app.use(cors()); // Add CORS middleware
app.use(bodyParser.json());

// Web3 setup
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545')); // Ganache default URL

// Add your account's private key (from MetaMask)
const privateKey = process.env.METAMASK_ACCOUNT_PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

// Initialize default account with error handling
const initializeWeb3 = async () => {
    try {
        console.log('Default account set:', web3.eth.defaultAccount);
    } catch (error) {
        console.error('Web3 initialization error:', error.message);
    }
};

initializeWeb3();

const contract = new web3.eth.Contract(contractABI, contractAddress);

// API endpoints
const registeredAccountNumberHashes = new Set();

app.post('/register', async (req, res) => {
    const { username, accountNumberHash } = req.body;
    try {
        if (registeredAccountNumberHashes.has(accountNumberHash)) {
            throw new Error('Account number hash is already registered');
        }
        
        // Check if the account number hash is already registered in the database
        const existingVoter = await Voter.findOne({ accountNumberHash });
        if (existingVoter) {
            throw new Error('Account number hash is already registered');
        }

        // Register the voter in the smart contract with gas parameters
        const gasEstimate = await contract.methods.registerVoter().estimateGas({ from: web3.eth.defaultAccount });
        await contract.methods.registerVoter().send({ 
            from: web3.eth.defaultAccount,
            gas: gasEstimate + 50000 // Adding buffer for safety
        });

        // Save the voter details in the database
        await new Voter({ username, accountNumberHash }).save();
        registeredAccountNumberHashes.add(accountNumberHash);

        res.json({ message: 'Voter registered successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/vote', async (req, res) => {
    const { address, candidateName } = req.body;
    try {
        if (!web3.utils.isAddress(address) || !candidateName) {
            throw new Error('Invalid address or candidate name');
        }

        const voter = await VoterModel.findOne({ address });
        if (!voter || !voter.isRegistered) {
            throw new Error('Voter is not registered');
        }

        if (voter.hasVoted) {
            throw new Error('Voter has already voted');
        }

        const candidates = await contract.methods.getCandidateList().call();
        if (!candidates.includes(candidateName)) {
            throw new Error('Candidate does not exist');
        }

        await contract.methods.castVote(candidateName).send({ 
            from: address,
            gas: 3000000 // Added gas limit
        });

        voter.hasVoted = true;
        await voter.save();

        res.json({ message: 'Vote cast successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/candidates', async (req, res) => {
    try {
        console.log('Attempting to get candidates list...');
        console.log('Contract address:', contractAddress);
        console.log('Contract ABI:', JSON.stringify(contractABI, null, 2));
        console.log('Default account:', web3.eth.defaultAccount);
        
        const candidates = await contract.methods.getCandidateList().call();
        console.log('Candidates:', candidates);
        res.json(candidates);
    } catch (error) {
        console.error('Detailed error:', error);
        console.error('Contract state:', await web3.eth.getCode(contractAddress));
        res.status(400).json({ error: error.message });
    }
});


// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Documentation endpoint
app.get('/', (req, res) => {
    res.json({
        endpoints: {
            register: {
                description: 'Register a voter',
                method: 'POST',
                path: '/register',
                body: {
                    username: 'String (Voter username)',
                    accountNumberHash: 'String (Hashed account number)',
                },
            },
            vote: {
                description: 'Cast a vote',
                method: 'POST',
                path: '/vote',
                body: {
                    address: 'String (Ethereum address)',
                    candidateName: 'String (Candidate name)',
                },
            },
            candidates: {
                description: 'Get the list of candidates',
                method: 'GET',
                path: '/candidates',
            },
            addCandidate: {
                description: 'Register a new candidate',
                method: 'POST',
                path: '/add-candidate',
                body: {
                    candidateName: 'String (Candidate name)',
                },
            },
            testContract: {
                description: 'Test if the smart contract is deployed and accessible',
                method: 'GET',
                path: '/test-contract',
            }
        },
    });
});

// Add this after your other endpoints
app.post('/add-candidate', async (req, res) => {
    const { candidateName } = req.body;
    try {
        if (!candidateName) {
            throw new Error('Candidate name is required');
        }

        // Call the smart contract's addCandidate function
        const gasEstimate = await contract.methods.addCandidate(candidateName).estimateGas({ 
            from: web3.eth.defaultAccount 
        });
        
        await contract.methods.addCandidate(candidateName).send({ 
            from: web3.eth.defaultAccount,
            gas: gasEstimate + 50000
        });

        res.json({ message: `Candidate ${candidateName} registered successfully` });
    } catch (error) {
        console.error('Add candidate error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/test-contract', async (req, res) => {
    try {
        const isDeployed = await web3.eth.getCode(contractAddress);
        if(isDeployed === '0x') {
            throw new Error('Contract not found at specified address');
        }
        res.json({ 
            status: 'Contract found',
            address: contractAddress,
            bytecode: isDeployed
        });
    } catch (error) {
        console.error('Contract test error:', error);
        res.status(400).json({ error: error.message });
    }
});

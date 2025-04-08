const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Handle connection errors after initial connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

module.exports = connectDB;

// Define schema for voters
const voterSchema = new mongoose.Schema({
address: { type: String, required: true, unique: true },
isRegistered: { type: Boolean, default: false },
hasVoted: { type: Boolean, default: false },
});

// Define schema for election results
const resultSchema = new mongoose.Schema({
candidateName: { type: String, required: true },
voteCount: { type: Number, default: 0 },
});

// Create models for the schemas
const VoterModel = mongoose.model('Voter', voterSchema);
const ResultModel = mongoose.model('Result', resultSchema);
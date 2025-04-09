// voterModel.js
const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
    username: { type: String, required: true },
    accountNumberHash: { type: String, required: true, unique: true },
    constituency: { type: String, required: true },
    isRegistered: { type: Boolean, default: false },
    hasVoted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Voter', voterSchema);
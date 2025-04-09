// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        string constituency;
    }

    struct Candidate {
        string name;
        address publicKey;
    }

    mapping(address => Voter) public voters;
    mapping(string => Candidate) public candidates;
    mapping(string => uint256) public votesReceived;
    string[] public candidateList;
    

    // Register a voter with signature verification and constituency
    function registerVoter(string memory _constituency, bytes memory signature) public {
        require(!voters[msg.sender].isRegistered, "Already registered");

        // Create hash of the message
        bytes32 messageHash = getMessageHash(msg.sender, _constituency);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        // Recover signer from signature
        address signer = recoverSigner(ethSignedMessageHash, signature);
        require(signer == msg.sender, "Invalid signature");

        voters[msg.sender] = Voter({
            isRegistered: true,
            hasVoted: false,
            constituency: _constituency
        });
    }
    

    // Add a new candidate
    function addCandidate(string memory _name) public {
        require(candidates[_name].publicKey == address(0), "Candidate already exists");

        candidates[_name] = Candidate({
            name: _name,
            publicKey: msg.sender
        });

        candidateList.push(_name);
    }

    // Cast vote
    function castVote(string memory _candidateName) public {
        require(voters[msg.sender].isRegistered, "You are not registered");
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(candidates[_candidateName].publicKey != address(0), "Candidate does not exist");

        voters[msg.sender].hasVoted = true;
        votesReceived[_candidateName]++;
    }

    // View candidates
    function getCandidateList() public view returns (string[] memory) {
        return candidateList;
    }

    // View total votes for a candidate
    function totalVotesFor(string memory _candidateName) public view returns (uint256) {
        return votesReceived[_candidateName];
    }

    // ========== Signature Verification Helpers ==========

    function getMessageHash(address voter, string memory _constituency) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(voter, _constituency));
    }

    function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}

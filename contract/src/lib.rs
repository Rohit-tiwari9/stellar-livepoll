#![no_std]

///
/// StellarVote — Soroban Poll Smart Contract
/// Deploy to Stellar Testnet via Stellar CLI
///
/// Functions:
///   vote(voter: Address, option: Symbol) -> Result<(), PollError>
///   get_results() -> Map<Symbol, u32>
///   has_voted(voter: Address) -> bool
///
/// Storage keys:
///   VOTES  (Persistent) -> Map<Symbol, u32>
///   VOTERS (Persistent) -> Map<Address, bool>
///

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Address, Env, Map, Symbol,
};

// ─── Storage Keys ────────────────────────────────────────────

const VOTES_KEY: Symbol = symbol_short!("VOTES");
const VOTERS_KEY: Symbol = symbol_short!("VOTERS");

// ─── Error Enum ───────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PollError {
    AlreadyVoted = 1,
    InvalidOption = 2,
}

// ─── Valid Poll Options ───────────────────────────────────────

fn valid_options() -> [Symbol; 4] {
    [
        symbol_short!("rust"),
        symbol_short!("js"),
        symbol_short!("python"),
        symbol_short!("go"),
    ]
}

// ─── Contract ─────────────────────────────────────────────────

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    /// Cast a vote
    pub fn vote(env: Env, voter: Address, option: Symbol) -> Result<(), PollError> {
        voter.require_auth();

        // Validate option
        if !valid_options().iter().any(|o| o == &option) {
            return Err(PollError::InvalidOption);
        }

        // Get voters map
        let mut voters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&VOTERS_KEY)
            .unwrap_or_else(|| Map::new(&env));

        // Check if already voted
        if voters.get(voter.clone()).unwrap_or(false) {
            return Err(PollError::AlreadyVoted);
        }

        // Save voter
        voters.set(voter.clone(), true);
        env.storage().persistent().set(&VOTERS_KEY, &voters);

        // Get votes map
        let mut votes: Map<Symbol, u32> = env
            .storage()
            .persistent()
            .get(&VOTES_KEY)
            .unwrap_or_else(|| Map::new(&env));

        let current = votes.get(option.clone()).unwrap_or(0);
        votes.set(option.clone(), current + 1);

        env.storage().persistent().set(&VOTES_KEY, &votes);

        // Emit event
        env.events().publish((symbol_short!("VOTED"), voter), option);

        Ok(())
    }

    /// Get all results
    pub fn get_results(env: Env) -> Map<Symbol, u32> {
        env.storage()
            .persistent()
            .get(&VOTES_KEY)
            .unwrap_or_else(|| Map::new(&env))
    }

    /// Check if voted
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voters: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&VOTERS_KEY)
            .unwrap_or_else(|| Map::new(&env));

        voters.get(voter).unwrap_or(false)
    }
}

// ─── Tests ────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_vote_success() {
        let env = Env::default();
        let cid = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &cid);
        let voter = Address::generate(&env);

        env.mock_all_auths();

        client.vote(&voter, &symbol_short!("rust"));

        let results = client.get_results();

        assert_eq!(results.get(symbol_short!("rust")).unwrap(), 1);
        assert!(client.has_voted(&voter));
    }

    #[test]
    fn test_double_vote_rejected() {
        let env = Env::default();
        let cid = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &cid);
        let voter = Address::generate(&env);

        env.mock_all_auths();

        client.vote(&voter, &symbol_short!("js"));

        let result = client.try_vote(&voter, &symbol_short!("js"));

        assert_eq!(result, Err(Ok(PollError::AlreadyVoted)));
    }

    #[test]
    fn test_invalid_option_rejected() {
        let env = Env::default();
        let cid = env.register_contract(None, PollContract);
        let client = PollContractClient::new(&env, &cid);
        let voter = Address::generate(&env);

        env.mock_all_auths();

        let result = client.try_vote(&voter, &symbol_short!("cobol"));

        assert_eq!(result, Err(Ok(PollError::InvalidOption)));
    }
}
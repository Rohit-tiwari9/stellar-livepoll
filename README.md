# ⬡ StellarVote — Live Blockchain Poll dApp

<div align="center">

![Stellar](https://img.shields.io/badge/Stellar-Testnet-7c5cfc?style=for-the-badge&logo=stellar&logoColor=white)
![Soroban](https://img.shields.io/badge/Soroban-Smart_Contract-00e5ff?style=for-the-badge)
![Rust](https://img.shields.io/badge/Rust-1.94.1-ff5733?style=for-the-badge&logo=rust&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)

**A production-ready, on-chain voting dApp built on Stellar Soroban Testnet.**  
Connect real wallets. Cast real votes. Track real transactions. All in real-time.

[🚀 Live Demo](#) · [📜 Smart Contract on Stellar Expert](#-smart-contract--stellar-expert) · [🐛 Report Bug](https://github.com/YOUR_USERNAME/stellarvote/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Poll Question](#-poll-question)
- [Features](#-features)
- [Architecture & Flow](#-architecture--flow)
- [Smart Contract](#-smart-contract--stellar-expert)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup & Installation](#-setup--installation)
- [Deploy the Contract](#-deploy-the-contract)
- [Run the Frontend](#-run-the-frontend)
- [Wallet Setup Guide](#-wallet-setup-guide)
- [Commit History](#-commit-history)
- [Error Handling](#-error-handling)
- [Level-2 Compliance Checklist](#-level-2-compliance-checklist)

---

## 🌟 Overview

StellarVote is a **Level-2 compliant** Web3 dApp that lets users vote on a live blockchain poll using their Stellar wallet. Every vote is an actual transaction submitted to the **Stellar Soroban Testnet**, stored permanently on-chain via a custom Rust smart contract.

The app supports **three wallets** (Freighter, Albedo, xBull), shows a real-time transaction lifecycle (sign → broadcast → ledger confirm), prevents double-voting at the contract level, and polls the chain every **2 seconds** to keep vote counts live.

---

## 🗳️ Poll Question

> **Which Programming Language Is Best for Web3 & Modern Software Development?**

| Option | Label |
|--------|-------|
| 🦀 | **Rust** — Systems & Safety |
| ⚡ | **JavaScript / TypeScript** — Web & Universal |
| 🐍 | **Python** — AI & Data Science |
| 🚀 | **Go** — Cloud & Concurrency |

---

## ✨ Features

| Feature | Status | Details |
|---------|--------|---------|
| Multi-Wallet Support | ✅ | Freighter, Albedo, xBull |
| Wallet Modal | ✅ | Auto-detects installed extensions |
| Soroban Smart Contract | ✅ | Deployed on Stellar Testnet |
| Real vote() Transaction | ✅ | Full XDR build → sign → submit |
| has_voted() Check | ✅ | On-chain double-vote prevention |
| get_results() Polling | ✅ | Every 2 seconds, no page refresh |
| Transaction Tracker | ✅ | 3-step: Sign → Broadcast → Ledger |
| TX Hash + Explorer Link | ✅ | Links to stellar.expert |
| Live Vote Progress Bars | ✅ | Animated, percentage + count |
| Total Votes Counter | ✅ | Real-time sum of all options |
| Error Handling | ✅ | 5 error types with toast alerts |
| Responsive Layout | ✅ | 1280px max-width, mobile-friendly |
| Starfield Background | ✅ | Canvas animation with ambient orbs |
| Session Cache | ✅ | Remembers vote across page refresh |

---

## 🏗️ Architecture & Flow

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STELLARVOTE dApp                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Frontend   │    │  WalletKit   │    │    SorobanRPC        │  │
│  │              │───▶│              │    │                      │  │
│  │  index.html  │    │  Freighter   │    │  JSON-RPC 2.0        │  │
│  │  style.css   │    │  Albedo      │    │  simulateTx          │  │
│  │  app.js      │    │  xBull       │    │  sendTx              │  │
│  └──────────────┘    └──────────────┘    │  getTx (poll)        │  │
│         │                   │            └──────────────────────┘  │
│         │                   │                       │              │
│         ▼                   ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Stellar Testnet                            │  │
│  │                                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐    │  │
│  │  │          Soroban Smart Contract (Rust)               │    │  │
│  │  │                                                      │    │  │
│  │  │  vote(voter, option)  →  Result<(), PollError>       │    │  │
│  │  │  get_results()        →  Map<Symbol, u32>            │    │  │
│  │  │  has_voted(voter)     →  bool                        │    │  │
│  │  │                                                      │    │  │
│  │  │  Contract ID: CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OX...   │    │  │
│  │  └─────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Voting Flow (Step-by-Step)

```
USER                    FRONTEND               WALLET              SOROBAN RPC            BLOCKCHAIN
 │                          │                     │                     │                     │
 │  1. Clicks wallet        │                     │                     │                     │
 │─────────────────────────▶│                     │                     │                     │
 │                          │  2. Detect wallet   │                     │                     │
 │                          │────────────────────▶│                     │                     │
 │                          │  3. requestAccess() │                     │                     │
 │                          │────────────────────▶│                     │                     │
 │                          │  4. getPublicKey()  │                     │                     │
 │                          │◀────────────────────│                     │                     │
 │  5. Address displayed    │                     │                     │                     │
 │◀─────────────────────────│                     │                     │                     │
 │                          │                     │                     │                     │
 │  6. Clicks "Cast Vote"   │                     │                     │                     │
 │─────────────────────────▶│                     │                     │                     │
 │                          │  7. Load Account    │                     │                     │
 │                          │─────────────────────────────────────────▶│                     │
 │                          │  8. Build TX XDR    │                     │                     │
 │                          │  (TransactionBuilder│                     │                     │
 │                          │   Contract.call()   │                     │                     │
 │                          │   vote(voter, opt)) │                     │                     │
 │                          │  9. simulateTx()    │                     │                     │
 │                          │─────────────────────────────────────────▶│                     │
 │                          │  10. assembleTransaction (footprint+auth) │                     │
 │                          │◀─────────────────────────────────────────│                     │
 │                          │  11. signTransaction│                     │                     │
 │                          │────────────────────▶│                     │                     │
 │  [Wallet Popup Opens]    │                     │                     │                     │
 │◀─────────────────────────────────────────────▶│                     │                     │
 │  12. User Approves       │                     │                     │                     │
 │─────────────────────────────────────────────▶│                     │                     │
 │                          │  13. Signed XDR     │                     │                     │
 │                          │◀────────────────────│                     │                     │
 │                          │  14. sendTransaction(signed XDR)         │                     │
 │                          │─────────────────────────────────────────▶│                     │
 │                          │                     │                     │  15. Broadcast TX   │
 │                          │                     │                     │────────────────────▶│
 │                          │  16. Poll getTransaction(hash)            │                     │
 │                          │─────────────────────────────────────────▶│  (every 2s)         │
 │                          │  17. status = SUCCESS                     │                     │
 │                          │◀─────────────────────────────────────────│                     │
 │  18. Vote Confirmed ✅   │                     │                     │                     │
 │◀─────────────────────────│                     │                     │                     │
 │                          │  19. get_results() simulation             │                     │
 │                          │─────────────────────────────────────────▶│                     │
 │  20. UI Updates Live     │                     │                     │                     │
 │◀─────────────────────────│                     │                     │                     │
```

---

### Transaction State Machine

```
                    ┌─────────────┐
                    │    IDLE     │
                    │  (no tx)    │
                    └──────┬──────┘
                           │ User clicks "Cast Vote"
                           ▼
                    ┌─────────────┐
               ┌───│   PENDING   │───┐
               │   │ ⏳ Waiting  │   │
               │   └──────┬──────┘   │
               │          │           │ User rejects
               │          │           ▼
               │          │    ┌─────────────┐
               │          │    │   FAILED ❌  │
               │          │    │ Show toast  │
               │          │    └─────────────┘
               │          │
               │   Step 1: Wallet signature
               │          │
               │          ▼
               │   ┌──────────────┐
               │   │  SIGNING     │
               │   │ 🔑 Wallet    │
               │   │   popup open │
               │   └──────┬───────┘
               │          │ Signed XDR returned
               │          ▼
               │   ┌──────────────┐
               │   │ BROADCASTING │
               │   │ 📡 Sending   │
               │   │   to network │
               │   └──────┬───────┘
               │          │ sendTransaction() called
               │          ▼
               │   ┌──────────────┐
               │   │  CONFIRMING  │
               │   │ ⛓ Waiting   │
               │   │   for ledger │
               │   └──────┬───────┘
               │          │ status = "SUCCESS"
               │          ▼
               └─────▶ ┌─────────────┐
                        │  SUCCESS ✅ │
                        │ Vote stored │
                        │ on-chain    │
                        └─────────────┘
```

---

### Real-Time Polling Loop

```
App Starts
    │
    ▼
Poll.start()
    │
    ├──────────────────────────────────────────┐
    │                                          │ every 2000ms
    ▼                                          │
Contract.getResults()                          │
    │                                          │
    ▼                                          │
simulateTransaction(get_results XDR)           │
    │                                          │
    ├── Success ──▶ parseScVal Map             │
    │               │                          │
    │               ▼                          │
    │           Update STATE.votes             │
    │               │                          │
    │               ▼                          │
    │           UI.updatePollUI()              │
    │           • Update counts                │
    │           • Update percentages           │
    │           • Animate progress bars        │
    │           • Update total votes           │
    │           • Highlight leader             │
    │               │                          │
    └── Error   ──▶ Log warn, retry ──────────┘
```

---

### Error Handling Decision Tree

```
Error Received
      │
      ├── code === "WALLET_NOT_INSTALLED"
      │         └──▶ Toast: "Install wallet extension" [ERROR]
      │
      ├── code === "TX_REJECTED" OR message includes "denied"/"cancel"
      │         └──▶ Toast: "Transaction rejected in wallet" [WARNING]
      │
      ├── code === "INSUFFICIENT_BALANCE" OR message includes "insufficient"
      │         └──▶ Toast: "Fund at friendbot.stellar.org" [ERROR]
      │
      ├── instanceof NetworkError OR message includes "fetch"/"timeout"
      │         └──▶ Toast: "Cannot reach Stellar Testnet" [ERROR]
      │
      ├── code === "WRONG_NETWORK"
      │         └──▶ Toast: "Switch wallet to Testnet" [ERROR]
      │
      ├── code === "ALREADY_VOTED"
      │         └──▶ Toast: "Address already voted" [WARNING]
      │              + Mark hasVoted = true in state
      │
      └── (fallback)
                └──▶ Toast: Generic error message [ERROR]
```

---

## 📜 Smart Contract & Stellar Expert

### Contract Details

| Field | Value |
|-------|-------|
| **Contract ID** | `CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE` |
| **Network** | Stellar Testnet |
| **Language** | Rust (Soroban SDK v20) |
| **WASM** | `poll_contract.wasm` |
| **Explorer** | [View on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE) |

### View on Stellar Expert

```
https://stellar.expert/explorer/testnet/contract/CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE
```

The Stellar Expert page shows:
- Contract creation transaction
- All `vote()` invocations with voter addresses
- `VOTED` events emitted per vote
- Persistent ledger storage entries (VOTES + VOTERS maps)
- Full transaction history

### Contract Functions

```rust
// Cast a vote — requires auth, prevents double-voting, emits event
pub fn vote(env: Env, voter: Address, option: Symbol) -> Result<(), PollError>

// Read all current vote counts (read-only, no fee)
pub fn get_results(env: Env) -> Map<Symbol, u32>

// Check if an address has already voted (read-only)
pub fn has_voted(env: Env, voter: Address) -> bool
```

### Contract Storage Layout

```
Persistent Storage
├── "VOTES"   → Map<Symbol, u32>
│               ├── "rust"   → u32 (vote count)
│               ├── "js"     → u32
│               ├── "python" → u32
│               └── "go"     → u32
│
└── "VOTERS"  → Map<Address, bool>
                ├── GADDR1... → true
                ├── GADDR2... → true
                └── ...
```

### Contract Events

Every successful vote emits:
```
Topics: ["VOTED", <voter_address>]
Data:   <option_symbol>   // e.g. "rust", "js", "python", "go"
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Smart Contract** | Rust + Soroban SDK | `soroban-sdk 20.0.0` |
| **Contract Compiler** | `wasm32-unknown-unknown` | Rust 1.94.1 |
| **Blockchain** | Stellar Soroban Testnet | — |
| **RPC** | Soroban JSON-RPC 2.0 | `soroban-testnet.stellar.org` |
| **Horizon** | Stellar Horizon Testnet | `horizon-testnet.stellar.org` |
| **Stellar SDK** | stellar-sdk (UMD) | `12.3.0` |
| **Wallet — Freighter** | FreighterApi browser extension | Latest |
| **Wallet — Albedo** | albedo-link SDK | `0.2.4` |
| **Wallet — xBull** | xBullSDK browser extension | Latest |
| **Frontend** | Vanilla JS (ES2022) | — |
| **Fonts** | Rajdhani + JetBrains Mono | Google Fonts |
| **Deployment** | Vercel / Netlify / GitHub Pages | — |

---

## 📁 Project Structure

```
stellarvote/
│
├── 📄 index.html              # App shell — full-width layout, wallet modal,
│                              #   vote cards, TX tracker, sidebar
│
├── 🎨 style.css               # Dark Terminal-Luxe theme
│                              #   Rajdhani + JetBrains Mono fonts
│                              #   Ambient orbs, starfield, animations
│                              #   1280px max-width responsive grid
│
├── ⚙️  app.js                  # Production JS — 1200+ lines
│   ├── CONFIG                 #   Contract ID, RPC URLs, options
│   ├── AppState               #   Reactive state object
│   ├── WalletKit              #   Freighter/Albedo/xBull connection & signing
│   ├── SorobanRPC             #   JSON-RPC 2.0 wrapper (simulate/send/get)
│   ├── Contract               #   vote(), getResults(), hasVoted()
│   ├── Vote                   #   Full TX lifecycle controller
│   ├── Poll                   #   2s real-time sync loop
│   ├── UI                     #   Reactive DOM update layer
│   ├── ErrorHandler           #   5-type categorized error handler
│   ├── Toast                  #   Notification system
│   └── initStarfield          #   Canvas animation
│
└── contract/
    ├── 📦 Cargo.toml          # soroban-sdk = "20.0.0"
    ├── src/
    │   └── 🦀 lib.rs          # Soroban contract source
    └── target/
        └── wasm32-unknown-unknown/
            └── release/
                └── poll_contract.wasm   # Compiled WASM binary
```

---

## 📋 Prerequisites

### For Running the Frontend

- Any modern browser (Chrome, Firefox, Brave, Edge)
- One of: [Freighter](https://freighter.app) extension, or [Albedo](https://web.albedo.link) (web-based, no install), or [xBull](https://xbull.app) extension
- A funded Stellar **Testnet** account

### For Deploying the Contract

- **Rust** `1.70+` with `wasm32-unknown-unknown` target
- **Stellar CLI** (`stellar-cli`) with `--features opt`
- A funded deployer Testnet account

---

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/stellarvote.git
cd stellarvote
```

### 2. No Build Step Required

The frontend uses only CDN-loaded libraries. Simply open `index.html` or serve it statically:

```bash
# Option A — open directly in browser
open index.html

# Option B — local static server
npx serve .
# or
python3 -m http.server 3000

# Option C — VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

### 3. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (from project root)
vercel

# Follow prompts — select "No framework" when asked
# Your app will be live at https://stellarvote.vercel.app
```

---

## 📦 Deploy the Contract

> **Note:** The contract is already deployed at `CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE`. These steps are for redeploying your own instance.

### Step 1 — Install Rust Target

```bash
rustup target add wasm32-unknown-unknown
```

### Step 2 — Install Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
```

### Step 3 — Build the Contract

```bash
cd contract

# Build WASM binary
cargo build --target wasm32-unknown-unknown --release

# Optimize (reduce WASM size significantly)
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/poll_contract.wasm
```

### Step 4 — Fund Deployer Account

```bash
# Generate a new keypair
stellar keys generate --global deployer --network testnet

# Fund via Friendbot
stellar keys fund deployer --network testnet

# Or manually via browser:
# https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

### Step 5 — Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/poll_contract.optimized.wasm \
  --source deployer \
  --network testnet

# Output:
# ✅ Contract deployed!
# CONTRACT_ID: CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE
```

### Step 6 — Update Frontend Config

Open `app.js` and update the `CONTRACT_ID`:

```javascript
const CONFIG = {
  CONTRACT_ID: "YOUR_NEW_CONTRACT_ID_HERE",  // ← paste here
  // ...
};
```

### Step 7 — Verify Deployment

```bash
# Read current vote results
stellar contract invoke \
  --id CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE \
  --network testnet \
  -- get_results

# Check if an address has voted
stellar contract invoke \
  --id CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE \
  --network testnet \
  -- has_voted \
  --voter GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Cast a test vote (requires --source)
stellar contract invoke \
  --id CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE \
  --source deployer \
  --network testnet \
  -- vote \
  --voter GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --option rust
```

---

## 🏃 Run the Frontend

### Quick Start

```bash
# Serve locally
npx serve .

# Open in browser
open http://localhost:3000
```

### Using the App

1. **Open** `http://localhost:3000` (or your deployed URL)
2. **Click** "Connect Wallet" in the top-right
3. **Select** Freighter, Albedo, or xBull from the modal
4. **Approve** the connection in your wallet
5. **See** your address appear in the nav bar (e.g., `GABCD...XYZ1`)
6. **Click** "Cast Vote" next to your preferred language
7. **Approve** the transaction in the wallet popup
8. **Watch** the 3-step transaction tracker update live
9. **See** your vote reflected in the progress bars

---

## 👛 Wallet Setup Guide

### Freighter (Recommended for Testing)

1. Install from [freighter.app](https://freighter.app)
2. Create or import a Stellar account
3. **Switch to Testnet:** Click avatar → Settings → Network → **Test Network**
4. **Fund your account:** Visit `https://friendbot.stellar.org/?addr=YOUR_ADDRESS`
5. You need at least **0.1 XLM** for transaction fees

### Albedo (Easiest — No Extension)

1. No installation required — Albedo is a web wallet
2. When you click "Connect Albedo", a popup window opens automatically
3. Create or log into your Albedo account
4. Approve the public key sharing request
5. Fund your address at Friendbot if needed

### xBull

1. Install from [xbull.app](https://xbull.app)
2. Set up your account
3. Switch to **Testnet** in the wallet settings
4. Fund at Friendbot

### Fund with Testnet XLM (Free)

```
https://friendbot.stellar.org/?addr=YOUR_STELLAR_ADDRESS
```

Or via CLI:
```bash
curl "https://friendbot.stellar.org?addr=YOUR_STELLAR_ADDRESS"
```

---

## 📝 Commit History

This project follows the **Level-2 Commit Structure**:

```
git log --oneline

abc1234  feat: real-time sync + TX tracker + full-width UI (Commit 3)
def5678  feat: Soroban contract vote() + complete TX lifecycle (Commit 2)
ghi9012  feat: multi-wallet integration — Freighter, Albedo, xBull (Commit 1)
jkl3456  chore: project init — file structure + config
```

### Commit 1 — Wallet Integration

```bash
git add app.js index.html style.css
git commit -m "feat: multi-wallet integration — Freighter, Albedo, xBull detection + connect/disconnect flow

- WalletKit module with connectFreighter(), connectAlbedo(), connectXBull()
- Real FreighterApi.requestAccess() + getPublicKey() + network check
- Dynamic Albedo SDK load from CDN
- xBullSDK connection with canRequestPublicKey
- Wallet modal UI with extension detection status labels
- Connected chip in topbar with address + disconnect button
- AppState management for wallet type and address"
```

### Commit 2 — Smart Contract + Voting

```bash
git add app.js contract/src/lib.rs contract/Cargo.toml
git commit -m "feat: Soroban contract deployment + full voting transaction lifecycle

- Contract: vote(), get_results(), has_voted() in Rust
- Double-vote prevention via persistent Map<Address, bool>
- SorobanRPC layer: simulateTransaction, sendTransaction, getTransaction
- Contract.vote(): build XDR → simulate → assemble → sign → submit → confirm
- TransactionBuilder + StellarSdk.SorobanRpc.assembleTransaction()
- waitForTransaction() polling loop with 30s timeout
- Balance check via Horizon before building transaction
- ErrorHandler with 5 categorized error types + WalletError/ContractError classes"
```

### Commit 3 — Real-Time Sync

```bash
git add app.js style.css
git commit -m "feat: real-time 2s polling + transaction tracker + animated UI

- Poll module: setInterval 2000ms calling Contract.getResults()
- Parses ScVal Map from Soroban simulation response
- Reactive UI.updatePollUI(): bars, counts, percentages, leader highlight
- 3-step TX tracker: Wallet signature → Broadcast → Ledger confirmation
- Transaction hash with Stellar Expert explorer link
- Toast notification system with 5 types (success/error/warning/info)
- Starfield canvas animation + ambient glow orbs
- Voted confirmation card with pop-in animation
- Session storage cache for has_voted across page refresh"
```

---

## ⚠️ Error Handling

The app handles **6 error scenarios** with user-friendly toast notifications:

| # | Error Type | Code | Trigger | User Message |
|---|-----------|------|---------|--------------|
| 1 | Wallet Not Installed | `WALLET_NOT_INSTALLED` | Extension missing | "Install Freighter from freighter.app then refresh" |
| 2 | Transaction Rejected | `TX_REJECTED` | User clicks Cancel in wallet | "You rejected the transaction in your wallet" |
| 3 | Insufficient Balance | `INSUFFICIENT_BALANCE` | < 0.1 XLM | "Fund your account at friendbot.stellar.org then retry" |
| 4 | Network Failure | `NetworkError` | RPC unreachable, timeout | "Cannot reach Stellar Testnet. Check your connection." |
| 5 | Wrong Network | `WRONG_NETWORK` | Freighter on Mainnet | "Switch your wallet to Stellar Testnet" |
| 6 | Already Voted | `ALREADY_VOTED` | On-chain duplicate | "This address has already voted on this poll" |

---

## ✅ Level-2 Compliance Checklist

### Multi-Wallet Integration

- [x] **Freighter** — `FreighterApi.requestAccess()` + `getPublicKey()` + network check + `signTransaction()`
- [x] **Albedo** — Dynamic SDK load + `albedo.publicKey()` + `albedo.tx()` signing
- [x] **xBull** — `xBullSDK.connect()` + `getPublicKey()` + `sign()`
- [x] Wallet selection modal with extension detection
- [x] Display wallet type + truncated address in nav
- [x] Disconnect button

### Smart Contract

- [x] Deployed to Stellar Testnet (`CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE`)
- [x] `vote(voter, option)` function with auth
- [x] `get_results()` returns `Map<Symbol, u32>`
- [x] `has_voted(voter)` returns `bool`
- [x] On-chain double-vote prevention (returns `AlreadyVoted` error)
- [x] Emits `VOTED` event per vote
- [x] Persistent storage survives ledger close
- [x] Contract ID visible in topbar
- [x] Stellar Expert explorer link in topbar

### Contract Called From Frontend

- [x] `TransactionBuilder` builds invocation XDR
- [x] `simulateTransaction` gets footprint + auth
- [x] `assembleTransaction` preps final XDR
- [x] Wallet signs transaction
- [x] `sendTransaction` broadcasts to network
- [x] `waitForTransaction` polls until `SUCCESS`

### Real-Time Event Integration

- [x] `Poll.start()` runs every 2000ms
- [x] Calls `get_results()` via RPC simulation
- [x] Parses `ScVal` map response
- [x] Updates vote counts, bars, percentages, total without reload

### Transaction Status Visible

- [x] **Pending** — "Waiting for wallet confirmation" + spinner
- [x] **Step 1** — "Wallet signature" with active/done/error states
- [x] **Step 2** — "Broadcast" with active/done/error states
- [x] **Step 3** — "Ledger confirm" with active/done/error states
- [x] **Success** — "Vote confirmed ✅" with hash + explorer link
- [x] **Failed** — "Transaction failed ❌" with error toast

### Error Handling (minimum 3)

- [x] Wallet not installed
- [x] Transaction rejected
- [x] Insufficient balance
- [x] Network failure
- [x] Wrong network
- [x] Already voted (bonus)

### Total Votes Display

- [x] Live total displayed in hero bar: `N votes cast`
- [x] "Total Votes" stat box in sidebar
- [x] Calculated as `rust + js + python + go`
- [x] Updates every 2 seconds

### UI/UX

- [x] Full-width layout (1280px max-width)
- [x] Two-column grid (vote cards + sidebar)
- [x] Ambient orb background + canvas starfield
- [x] Wallet modal with spring animation
- [x] Vote button loading spinner + label change
- [x] Progress bar CSS transition animation
- [x] Voted confirmation card with pop animation
- [x] Toast notifications slide in from right

---

## 📄 License

MIT © 2025 — See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built on [Stellar](https://stellar.org) · Powered by [Soroban](https://soroban.stellar.org)**

⬡ StellarVote — Real votes. Real chain. Real time.

</div>

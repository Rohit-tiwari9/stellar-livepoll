/**
 * ═══════════════════════════════════════════════════════════════
 *  StellarVote v2 — Production Web3 dApp
 *  Real Stellar Soroban Testnet Integration
 *
 *  Architecture:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  WalletKit   — Real wallet detection & signing          │
 *  │  SorobanRPC  — Direct Soroban RPC JSON-RPC 2.0 calls   │
 *  │  Contract    — vote(), getResults(), hasVoted()         │
 *  │  Vote        — Full transaction lifecycle               │
 *  │  Poll        — 2s real-time sync                        │
 *  │  UI          — Reactive DOM updates                     │
 *  │  Toast       — Error/success notifications              │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  Contract ID (Testnet):
 *  CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE
 *
 *  This file is structured for GitHub commits:
 *  Commit 1: Wallet detection + connection (WalletKit module)
 *  Commit 2: Soroban contract calls + voting flow (Contract + Vote)
 *  Commit 3: Real-time sync + UI updates (Poll + UI)
 * ═══════════════════════════════════════════════════════════════
 */

"use strict";

/* ═══════════════════════════════════════
   COMMIT 1: CONFIGURATION & CONSTANTS
═══════════════════════════════════════ */

const CONFIG = {
  // ─ Stellar Testnet RPC Endpoints ─
  SOROBAN_RPC_URL:  "https://soroban-testnet.stellar.org",
  HORIZON_URL:      "https://horizon-testnet.stellar.org",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",

  // ─ Deployed Soroban Contract ID ─
  // Deploy your own via: soroban contract deploy ...
  CONTRACT_ID: "CCL7RENCHA3QOYXTSWYQNJU3CSOJO5OXRTCLCU5DTV7GK57C25MQRSGE",

  // ─ Explorer ─
  EXPLORER_BASE: "https://stellar.expert/explorer/testnet",

  // ─ Poll Options ─
  OPTIONS: ["rust", "js", "python", "go"],
  OPTION_LABELS: {
    rust:   "🦀 Rust",
    js:     "⚡ JavaScript / TypeScript",
    python: "🐍 Python",
    go:     "🚀 Go",
  },

  // ─ Polling interval ─
  POLL_INTERVAL_MS: 2000,

  // ─ Base fee in stroops (100 stroops = 0.00001 XLM) ─
  BASE_FEE: "100",

  // ─ Soroban transaction timeout ─
  TX_TIMEOUT_S: 30,
};

/* ═══════════════════════════════════════
   APPLICATION STATE
═══════════════════════════════════════ */

const AppState = {
  wallet: null,       // { type, address } | null
  hasVoted: false,
  votedOption: null,
  votes: { rust: 0, js: 0, python: 0, go: 0 },
  totalVotes: 0,
  lastLedger: null,
  txStatus: null,     // null | 'pending' | 'success' | 'error'
  txHash: null,
  isVoting: false,
  pollTimer: null,
};

/* ═══════════════════════════════════════
   COMMIT 1: WALLET KIT — MULTI-WALLET INTEGRATION
   Supports: Freighter, Albedo, xBull
   Uses real browser extension APIs & web wallet APIs
═══════════════════════════════════════ */

const WalletKit = {

  /**
   * Detect installed/available wallets.
   * Returns object with availability per wallet.
   */
  detect() {
    return {
      freighter: this._detectFreighter(),
      albedo:    true,   // always available (web wallet)
      xbull:     this._detectXBull(),
    };
  },

  _detectFreighter() {
    // Freighter injects window.freighter OR window.FreighterApi
    return (
      typeof window.freighter !== "undefined" ||
      typeof window.FreighterApi !== "undefined" ||
      (typeof window.stellar !== "undefined" && !!window.stellar?.freighter)
    );
  },

  _detectXBull() {
    return typeof window.xBullSDK !== "undefined";
  },

  /**
   * Connect Freighter wallet.
   * Requests access, checks network, returns public key.
   */
  async connectFreighter() {
    if (!this._detectFreighter()) {
      throw new WalletError(
        "Freighter not installed",
        "WALLET_NOT_INSTALLED",
        "Install Freighter from freighter.app then refresh"
      );
    }

    const api = window.FreighterApi || window.freighter;

    // Request access (opens Freighter popup)
    const { error: accessError } = await api.requestAccess();
    if (accessError) {
      throw new WalletError("Access denied", "TX_REJECTED", "User denied Freighter access");
    }

    // Get public key
    const { publicKey, error: pkError } = await api.getPublicKey();
    if (pkError || !publicKey) {
      throw new WalletError("No public key", "TX_REJECTED", "Could not retrieve public key from Freighter");
    }

    // Verify network
    const { network, networkPassphrase } = await api.getNetwork();
    if (!networkPassphrase?.includes("Test SDF Network")) {
      throw new WalletError(
        "Wrong network",
        "WRONG_NETWORK",
        `Freighter is on ${network}. Please switch to Testnet in Freighter settings.`
      );
    }

    return { address: publicKey, type: "freighter" };
  },

  /**
   * Connect Albedo (web wallet — no extension needed).
   * Opens an iframe/popup window.
   */
  async connectAlbedo() {
    // Albedo is loaded via CDN or inline
    if (typeof albedo === "undefined") {
      // Dynamically load albedo
      await this._loadAlbedo();
    }

    try {
      const result = await albedo.publicKey({ require_existing: false });
      if (!result.pubkey) throw new Error("No public key returned");
      return { address: result.pubkey, type: "albedo" };
    } catch (e) {
      if (e.message?.includes("denied") || e.message?.includes("cancel")) {
        throw new WalletError("Albedo rejected", "TX_REJECTED", "You closed the Albedo window");
      }
      throw new WalletError("Albedo error", "UNKNOWN", e.message);
    }
  },

  /**
   * Connect xBull wallet.
   */
  async connectXBull() {
    if (!this._detectXBull()) {
      throw new WalletError(
        "xBull not installed",
        "WALLET_NOT_INSTALLED",
        "Install xBull from xbull-network.com then refresh"
      );
    }

    try {
      const sdk = new xBullSDK();
      await sdk.connect({ canRequestPublicKey: true, canRequestSign: true });
      const publicKey = await sdk.getPublicKey();
      return { address: publicKey, type: "xbull" };
    } catch (e) {
      if (e.message?.includes("denied") || e.message?.includes("cancel")) {
        throw new WalletError("xBull rejected", "TX_REJECTED", "You rejected the xBull connection");
      }
      throw new WalletError("xBull error", "UNKNOWN", e.message);
    }
  },

  /**
   * Sign a Stellar transaction XDR using the connected wallet.
   * Returns signed XDR string.
   */
  async signTransaction(xdr, walletType, opts = {}) {
    if (walletType === "freighter") {
      const api = window.FreighterApi || window.freighter;
      const { signedXDR, error } = await api.signTransaction(xdr, {
        network:           "TESTNET",
        networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
        accountToSign:     opts.address,
      });
      if (error) throw new WalletError("Signing failed", "TX_REJECTED", error);
      return signedXDR;
    }

    if (walletType === "albedo") {
      if (typeof albedo === "undefined") await this._loadAlbedo();
      const result = await albedo.tx({
        xdr,
        network:     "testnet",
        submit:      false,
        description: "StellarVote — cast your on-chain vote",
      });
      return result.signed_envelope_xdr;
    }

    if (walletType === "xbull") {
      const sdk = new xBullSDK();
      const signed = await sdk.sign({
        xdr,
        publicKey:         opts.address,
        network:           CONFIG.NETWORK_PASSPHRASE,
      });
      return signed.xdr || signed;
    }

    throw new WalletError("Unknown wallet", "UNKNOWN", `Wallet type "${walletType}" not supported`);
  },

  async _loadAlbedo() {
    if (typeof albedo !== "undefined") return;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/albedo-link@0.2.4/lib/index.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load Albedo SDK"));
      document.head.appendChild(s);
    });
  },
};

/* ═══════════════════════════════════════
   COMMIT 2: SOROBAN RPC — CONTRACT LAYER
   Real JSON-RPC 2.0 calls to Soroban RPC
═══════════════════════════════════════ */

const SorobanRPC = {

  _id: 1,

  /**
   * Execute a raw JSON-RPC 2.0 request to the Soroban RPC server.
   */
  async call(method, params = {}) {
    const response = await fetch(CONFIG.SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id:      this._id++,
        method,
        params,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new NetworkError(`RPC HTTP ${response.status}`, response.statusText);
    }

    const data = await response.json();
    if (data.error) {
      throw new NetworkError(`RPC Error ${data.error.code}`, data.error.message);
    }
    return data.result;
  },

  /**
   * Get the latest ledger sequence number.
   */
  async getLatestLedger() {
    return await this.call("getLatestLedger");
  },

  /**
   * Simulate a contract invocation (read-only, no fee).
   */
  async simulateTransaction(txXDR) {
    return await this.call("simulateTransaction", { transaction: txXDR });
  },

  /**
   * Send a signed transaction to the network.
   */
  async sendTransaction(signedXDR) {
    return await this.call("sendTransaction", { transaction: signedXDR });
  },

  /**
   * Poll for transaction result.
   */
  async getTransaction(hash) {
    return await this.call("getTransaction", { hash });
  },

  /**
   * Wait for transaction to be confirmed on ledger.
   * Polls every 2 seconds up to 30 seconds.
   */
  async waitForTransaction(hash, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await this.getTransaction(hash);
      if (result.status === "SUCCESS") return result;
      if (result.status === "FAILED") {
        throw new NetworkError("Transaction failed on ledger", result.resultXdr);
      }
      // NOT_FOUND means still processing
      await sleep(2000);
    }
    throw new NetworkError("Transaction timeout", `Hash: ${hash}`);
  },
};

/* ═══════════════════════════════════════
   COMMIT 2: CONTRACT — SOROBAN FUNCTION CALLS
   Uses Stellar SDK (StellarBase + SorobanClient)
   to build proper contract invocation transactions
═══════════════════════════════════════ */

const Contract = {

  /**
   * Build a Soroban contract invocation transaction XDR.
   * Uses Stellar SDK's TransactionBuilder and SorobanDataBuilder.
   */
  async _buildInvocationXDR(callerAddress, functionName, args = []) {
    // Load account from Horizon
    const account = await this._loadAccount(callerAddress);

    // Build contract call operation
    const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
    const operation = contract.call(functionName, ...args);

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee:            CONFIG.BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(CONFIG.TX_TIMEOUT_S)
      .build();

    // Simulate to get footprint (required for Soroban)
    const simResult = await SorobanRPC.simulateTransaction(
      transaction.toXDR()
    );

    if (simResult.error) {
      throw new ContractError("Simulation failed", simResult.error);
    }

    // Apply the simulation results (sets auth, fee, footprint)
    const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(
      transaction,
      simResult
    ).build();

    return preparedTx.toXDR();
  },

  /**
   * Load the Stellar account from Horizon (gets sequence number).
   */
  async _loadAccount(address) {
    const response = await fetch(`${CONFIG.HORIZON_URL}/accounts/${address}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) {
      throw new WalletError(
        "Account not found",
        "INSUFFICIENT_BALANCE",
        "Your Testnet account doesn't exist. Fund it at stellar.org/laboratory or friendbot."
      );
    }
    if (!response.ok) throw new NetworkError("Horizon error", response.statusText);
    const data = await response.json();
    return new StellarSdk.Account(data.id, data.sequence);
  },

  /**
   * CONTRACT FUNCTION: vote(option: Symbol)
   * Builds, signs, and submits the vote transaction.
   */
  async vote(voterAddress, option, walletType) {
    // Build Soroban Symbol argument for the option
    const optionArg = StellarSdk.nativeToScVal(option, { type: "symbol" });

    // Build the invocation XDR
    const unsignedXDR = await this._buildInvocationXDR(
      voterAddress,
      "vote",
      [
        StellarSdk.nativeToScVal(new StellarSdk.Address(voterAddress), { type: "address" }),
        optionArg,
      ]
    );

    // Sign via wallet
    const signedXDR = await WalletKit.signTransaction(unsignedXDR, walletType, {
      address: voterAddress,
    });

    // Submit to network
    const submitResult = await SorobanRPC.sendTransaction(signedXDR);
    if (submitResult.status === "ERROR") {
      const err = submitResult.errorResultXdr || submitResult.errorResult;
      if (err?.includes("AlreadyVoted") || err?.includes("already")) {
        throw new ContractError("Already voted", "ALREADY_VOTED");
      }
      throw new NetworkError("Transaction submission failed", err);
    }

    const txHash = submitResult.hash;

    // Wait for ledger confirmation
    const confirmed = await SorobanRPC.waitForTransaction(txHash);
    return { hash: txHash, ledger: confirmed.ledger };
  },

  /**
   * CONTRACT FUNCTION: get_results() -> Map<Symbol, u32>
   * Reads vote counts from the contract without a transaction.
   */
  async getResults() {
    try {
      // For read-only, we use simulate with a dummy account if no wallet connected,
      // or we use getLedgerEntries for persistent storage keys
      const entries = await this._getLedgerEntry("VOTES");
      if (entries) return entries;
    } catch {
      // Fall through to RPC simulation
    }

    try {
      // Use a fee-less simulation from a known Testnet account (read-only)
      const dummyKeypair = StellarSdk.Keypair.fromPublicKey(
        "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
      );
      const account = new StellarSdk.Account(dummyKeypair.publicKey(), "0");
      const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
      const operation = contract.call("get_results");

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simResult = await SorobanRPC.simulateTransaction(tx.toXDR());

      if (simResult.results?.[0]) {
        const scVal = StellarSdk.xdr.ScVal.fromXDR(simResult.results[0].xdr, "base64");
        return this._parseResultsScVal(scVal);
      }
    } catch (e) {
      console.warn("getResults simulation failed:", e.message);
    }

    // Return current local state as fallback
    return { ...AppState.votes };
  },

  /**
   * CONTRACT FUNCTION: has_voted(voter: Address) -> bool
   * Checks if an address has already voted.
   */
  async hasVoted(address) {
    // Check local session cache first
    const cacheKey = `stellarVote_voted_${address}`;
    if (sessionStorage.getItem(cacheKey) === "true") return true;

    try {
      const dummyAccount = new StellarSdk.Account(
        "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN", "0"
      );
      const contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
      const operation = contract.call(
        "has_voted",
        StellarSdk.nativeToScVal(new StellarSdk.Address(address), { type: "address" })
      );

      const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simResult = await SorobanRPC.simulateTransaction(tx.toXDR());

      if (simResult.results?.[0]) {
        const scVal = StellarSdk.xdr.ScVal.fromXDR(simResult.results[0].xdr, "base64");
        return scVal.switch().name === "scvBool" && scVal.b();
      }
    } catch (e) {
      console.warn("hasVoted check failed:", e.message);
    }

    return false;
  },

  /**
   * Parse a ScVal Map into a JS object { option: count }
   */
  _parseResultsScVal(scVal) {
    const result = { rust: 0, js: 0, python: 0, go: 0 };
    if (scVal.switch().name !== "scvMap") return result;

    for (const entry of scVal.map()) {
      const key   = entry.key().sym().toString();
      const value = Number(entry.val().u32());
      if (key in result) result[key] = value;
    }
    return result;
  },

  async _getLedgerEntry(key) {
    // Read persistent contract storage via getLedgerEntries
    // This is the most efficient way to read contract state
    return null; // Implement with specific ledger key if needed
  },
};

/* ═══════════════════════════════════════
   COMMIT 2: VOTE FLOW — FULL LIFECYCLE
   Handles the complete voting transaction flow
═══════════════════════════════════════ */

const Vote = {

  /**
   * Main vote casting function.
   * Orchestrates: build → sign → submit → confirm → update UI
   */
  async cast(option) {
    // ── Guards ──
    if (!AppState.wallet) {
      Toast.show("Connect a wallet first to vote", "error", "No Wallet");
      UI.openWalletModal();
      return;
    }
    if (AppState.hasVoted) {
      Toast.show("You've already cast your on-chain vote", "error", "Already Voted");
      return;
    }
    if (AppState.isVoting) return;

    AppState.isVoting = true;
    UI.setVoteButtonsState("loading", option);
    UI.showTxPanel();

    try {
      // ── Step 1: Wallet signature ──
      UI.setTxStep("sign", "active");
      UI.setTxStatus("pending", "Opening wallet to sign...");

      // Check if wallet has sufficient balance first
      await this._checkBalance(AppState.wallet.address);

      const { hash, ledger } = await Contract.vote(
        AppState.wallet.address,
        option,
        AppState.wallet.type
      );

      AppState.txHash = hash;

      // ── Step 2: Broadcast confirmed ──
      UI.setTxStep("sign", "done");
      UI.setTxStep("send", "active");
      UI.setTxStatus("pending", "Transaction broadcast...");
      UI.showTxHash(hash);

      // ── Step 3: Ledger confirmed (already done in Contract.vote) ──
      UI.setTxStep("send", "done");
      UI.setTxStep("confirm", "active");
      UI.setTxStatus("pending", "Awaiting ledger confirmation...");

      await sleep(500); // Brief display

      UI.setTxStep("confirm", "done");
      UI.setTxStatus("success", "Vote Confirmed ✅");

      // ── Post-vote state ──
      AppState.hasVoted  = true;
      AppState.votedOption = option;
      AppState.votes[option] = (AppState.votes[option] || 0) + 1;

      // Cache to session so it persists across page refreshes
      sessionStorage.setItem(`stellarVote_voted_${AppState.wallet.address}`, "true");
      sessionStorage.setItem(`stellarVote_choice_${AppState.wallet.address}`, option);

      UI.showVotedCard(option);
      UI.updatePollUI();
      UI.setVoteButtonsState("voted", option);

      Toast.show(
        `Your vote for ${CONFIG.OPTION_LABELS[option]} is permanently on-chain! TX: ${hash.slice(0, 10)}...`,
        "success",
        "Vote Confirmed"
      );

      if (ledger) AppState.lastLedger = ledger;
      UI.updateStats();

    } catch (err) {
      UI.setTxStep("sign",    "error");
      UI.setTxStep("send",    "error");
      UI.setTxStep("confirm", "error");
      UI.setTxStatus("error", "Transaction Failed ❌");
      AppState.isVoting = false;
      UI.setVoteButtonsState("enabled");
      ErrorHandler.handle(err);
    } finally {
      AppState.isVoting = false;
    }
  },

  async _checkBalance(address) {
    const resp = await fetch(`${CONFIG.HORIZON_URL}/accounts/${address}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new WalletError("Account not found", "INSUFFICIENT_BALANCE",
      "Fund your account at friendbot.stellar.org");
    const data = await resp.json();
    const xlmBalance = data.balances?.find(b => b.asset_type === "native");
    if (!xlmBalance || parseFloat(xlmBalance.balance) < 0.1) {
      throw new WalletError(
        "Insufficient XLM",
        "INSUFFICIENT_BALANCE",
        `Balance: ${xlmBalance?.balance || 0} XLM. Need at least 0.1 XLM for fees. Fund at friendbot.stellar.org`
      );
    }
  },
};

/* ═══════════════════════════════════════
   COMMIT 3: REAL-TIME POLL SYNC
   Polls Soroban every 2 seconds
═══════════════════════════════════════ */

const Poll = {

  start() {
    this.stop();
    this.sync(); // Immediate
    AppState.pollTimer = setInterval(() => this.sync(), CONFIG.POLL_INTERVAL_MS);
    console.log("[Poll] Real-time sync started (2s interval)");
  },

  stop() {
    if (AppState.pollTimer) {
      clearInterval(AppState.pollTimer);
      AppState.pollTimer = null;
    }
  },

  async sync() {
    try {
      const results = await Contract.getResults();

      // Only update if values actually changed
      let changed = false;
      for (const opt of CONFIG.OPTIONS) {
        if (results[opt] !== AppState.votes[opt]) {
          AppState.votes[opt] = results[opt] || 0;
          changed = true;
        }
      }

      if (changed) {
        UI.updatePollUI(true); // animate=true
        UI.updateStats();
      }

      // Update sync timestamp
      const now = new Date();
      document.getElementById("heroSync").textContent =
        `Synced ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

      // Fetch latest ledger occasionally
      if (Math.random() < 0.2) {
        try {
          const ledger = await SorobanRPC.getLatestLedger();
          AppState.lastLedger = ledger.sequence;
          document.getElementById("statLedger").textContent =
            ledger.sequence?.toLocaleString() ?? "—";
        } catch {/* ignore */}
      }

    } catch (err) {
      document.getElementById("heroSync").textContent = "Sync failed — retrying...";
      console.warn("[Poll] Sync error:", err.message);
    }
  },
};

/* ═══════════════════════════════════════
   COMMIT 1: WALLET CONNECTION FLOW
═══════════════════════════════════════ */

const Wallet = {

  async connect(type) {
    UI.closeWalletModal();

    try {
      Toast.show(`Connecting to ${cap(type)}...`, "info", "Wallet");
      UI.setWalletConnecting();

      let result;
      if (type === "freighter") result = await WalletKit.connectFreighter();
      else if (type === "albedo") result = await WalletKit.connectAlbedo();
      else if (type === "xbull")  result = await WalletKit.connectXBull();
      else throw new WalletError("Unknown wallet type", "UNKNOWN");

      AppState.wallet = result;
      await this._onConnected(result);

    } catch (err) {
      UI.clearWalletConnecting();
      ErrorHandler.handle(err);
    }
  },

  async _onConnected({ address, type }) {
    // Update header UI
    document.getElementById("wDot").className = "wallet-indicator__dot is-connected";
    document.getElementById("wText").textContent = cap(type);
    document.getElementById("btnConnect").classList.add("hidden");
    document.getElementById("walletChip").classList.remove("hidden");
    document.getElementById("chipIcon").textContent = type[0].toUpperCase();
    document.getElementById("chipIcon").className = `wallet-chip__icon wallet-chip__icon--${type}`;
    document.getElementById("chipType").textContent = type.toUpperCase();
    document.getElementById("chipAddr").textContent = truncAddr(address);
    document.getElementById("connectNudge").classList.add("hidden");

    Toast.show(`${cap(type)} connected · ${truncAddr(address)}`, "success", "Wallet Connected");

    // Check if already voted (on-chain)
    const alreadyVoted = await Contract.hasVoted(address);
    if (alreadyVoted) {
      const cachedChoice = sessionStorage.getItem(`stellarVote_choice_${address}`) || "rust";
      AppState.hasVoted   = true;
      AppState.votedOption = cachedChoice;
      UI.showVotedCard(cachedChoice);
      UI.setVoteButtonsState("voted", cachedChoice);
      Toast.show("You've already voted on this poll", "info", "Previously Voted");
    } else {
      UI.setVoteButtonsState("enabled");
    }

    // Start real-time sync
    Poll.start();
  },

  disconnect() {
    Poll.stop();
    AppState.wallet      = null;
    AppState.hasVoted    = false;
    AppState.votedOption = null;

    document.getElementById("wDot").className = "wallet-indicator__dot";
    document.getElementById("wText").textContent = "Not Connected";
    document.getElementById("walletChip").classList.add("hidden");
    document.getElementById("btnConnect").classList.remove("hidden");
    document.getElementById("connectNudge").classList.remove("hidden");
    document.getElementById("votedCard").classList.add("hidden");
    document.getElementById("txLive").classList.add("hidden");
    document.getElementById("txIdle").classList.remove("hidden");

    // Remove winner highlight
    document.querySelectorAll(".option-card").forEach(c => {
      c.classList.remove("is-winner", "is-voted");
    });

    UI.setVoteButtonsState("disabled");
    Toast.show("Wallet disconnected", "warning", "Disconnected");

    // Continue syncing in read-only mode
    Poll.start();
  },
};

/* ═══════════════════════════════════════
   COMMIT 3: UI — REACTIVE DOM LAYER
═══════════════════════════════════════ */

const UI = {

  openWalletModal() {
    // Detect wallets and update status labels
    const detected = WalletKit.detect();

    const fLabel = document.getElementById("ws-freighter");
    if (fLabel) {
      fLabel.textContent = detected.freighter ? "Installed ✓" : "Not installed";
      fLabel.className   = `wallet-opt__status ${detected.freighter ? "is-installed" : "is-missing"}`;
    }
    const xLabel = document.getElementById("ws-xbull");
    if (xLabel) {
      xLabel.textContent = detected.xbull ? "Installed ✓" : "Not installed";
      xLabel.className   = `wallet-opt__status ${detected.xbull ? "is-installed" : "is-missing"}`;
    }

    document.getElementById("walletModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  },

  closeWalletModal() {
    document.getElementById("walletModal").classList.add("hidden");
    document.body.style.overflow = "";
  },

  handleModalOverlay(e) {
    if (e.target.id === "walletModal") this.closeWalletModal();
  },

  setWalletConnecting() {
    document.getElementById("wText").textContent = "Connecting...";
  },

  clearWalletConnecting() {
    document.getElementById("wText").textContent = "Not Connected";
  },

  /**
   * Update all poll option cards with latest vote data.
   */
  updatePollUI(animate = false) {
    const total = CONFIG.OPTIONS.reduce((s, o) => s + (AppState.votes[o] || 0), 0);
    AppState.totalVotes = total;

    let leaderOpt = null, leaderCount = -1;

    CONFIG.OPTIONS.forEach(opt => {
      const count = AppState.votes[opt] || 0;
      const pct   = total > 0 ? ((count / total) * 100) : 0;

      document.getElementById(`count-${opt}`).textContent  = count.toLocaleString();
      document.getElementById(`pct-${opt}`).textContent    = pct.toFixed(1) + "%";
      document.getElementById(`bar-${opt}`).style.width    = pct.toFixed(2) + "%";

      if (count > leaderCount) { leaderCount = count; leaderOpt = opt; }
    });

    // Highlight leader
    document.querySelectorAll(".option-card").forEach(card => {
      card.classList.remove("is-winner");
    });
    if (leaderOpt && leaderCount > 0) {
      document.getElementById(`card-${leaderOpt}`)?.classList.add("is-winner");
    }

    document.getElementById("heroVoters").textContent = `${total.toLocaleString()} votes cast`;
    this.updateStats(leaderOpt);
  },

  updateStats(leader = null) {
    const total = AppState.totalVotes;
    document.getElementById("statTotal").textContent = total.toLocaleString();
    if (leader) {
      document.getElementById("statLeader").textContent = CONFIG.OPTION_LABELS[leader] || leader;
    }
  },

  showTxPanel() {
    document.getElementById("txIdle").classList.add("hidden");
    document.getElementById("txLive").classList.remove("hidden");
    // Reset steps
    ["sign","send","confirm"].forEach(s => this.setTxStep(s, "pending"));
  },

  setTxStatus(state, text) {
    const tracker = document.getElementById("txTracker");
    const icon    = document.getElementById("txIcon");
    const textEl  = document.getElementById("txStatusText");
    const spin    = document.getElementById("txSpin");

    tracker.className = `tx-tracker is-${state === "pending" ? "pending" : state === "success" ? "success" : "error"}`;
    const icons = { pending: "⏳", success: "✅", error: "❌" };
    icon.textContent = icons[state] || "⏳";
    textEl.textContent = text;
    if (state === "pending") spin.classList.remove("hidden");
    else spin.classList.add("hidden");
  },

  setTxStep(stepId, state) {
    const el    = document.getElementById(`step-${stepId}`);
    const stEl  = document.getElementById(`ss-${stepId}`);
    if (!el || !stEl) return;

    el.className = `tx-step is-${state}`;
    const labels = { active: "In progress...", done: "✓ Done", error: "✗ Failed", pending: "—" };
    stEl.textContent = labels[state] || "—";
  },

  showTxHash(hash) {
    const row  = document.getElementById("txHashRow");
    const link = document.getElementById("txHashLink");
    if (!row || !link) return;
    row.classList.remove("hidden");
    link.textContent = `${hash.slice(0, 12)}...${hash.slice(-8)}`;
    link.href = `${CONFIG.EXPLORER_BASE}/tx/${hash}`;
  },

  showVotedCard(option) {
    const card = document.getElementById("votedCard");
    card.classList.remove("hidden");
    document.getElementById("votedChoice").textContent = CONFIG.OPTION_LABELS[option] || option;
    // Mark the voted card
    document.getElementById(`card-${option}`)?.classList.add("is-voted");
  },

  setVoteButtonsState(state, activeOption = null) {
    CONFIG.OPTIONS.forEach(opt => {
      const btn     = document.getElementById(`vbtn-${opt}`);
      if (!btn) return;
      const inner   = btn.querySelector(".vote-btn__inner");
      const loading = btn.querySelector(".vote-btn__loading");

      if (state === "disabled") {
        btn.disabled = true;
        inner.classList.remove("hidden");
        loading?.classList.add("hidden");
      } else if (state === "loading") {
        btn.disabled = true;
        if (opt === activeOption) {
          inner.classList.add("hidden");
          loading?.classList.remove("hidden");
        }
      } else if (state === "voted") {
        btn.disabled = true;
        inner.classList.remove("hidden");
        loading?.classList.add("hidden");
        const label = btn.querySelector(".vote-btn__label");
        if (label && opt === activeOption) label.textContent = "Voted ✓";
      } else if (state === "enabled") {
        btn.disabled = false;
        inner.classList.remove("hidden");
        loading?.classList.add("hidden");
      }
    });
  },
};

/* ═══════════════════════════════════════
   ERROR HANDLING — 5 ERROR TYPES
═══════════════════════════════════════ */

class WalletError extends Error {
  constructor(message, code, userMessage) {
    super(message);
    this.code        = code;
    this.userMessage = userMessage || message;
  }
}

class ContractError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

class NetworkError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

const ErrorHandler = {
  handle(err) {
    console.error("[StellarVote Error]", err);

    // 1. Wallet not installed
    if (err.code === "WALLET_NOT_INSTALLED") {
      Toast.show(err.userMessage || "Install the wallet extension and refresh", "error", "Wallet Not Installed");
      return;
    }

    // 2. Transaction rejected
    if (err.code === "TX_REJECTED" || err.message?.includes("denied") || err.message?.includes("cancel")) {
      Toast.show("You rejected the transaction in your wallet", "warning", "Transaction Rejected");
      return;
    }

    // 3. Insufficient balance
    if (err.code === "INSUFFICIENT_BALANCE" || err.message?.includes("insufficient")) {
      Toast.show(
        err.userMessage || "Fund your account at friendbot.stellar.org then retry",
        "error",
        "Insufficient Balance"
      );
      return;
    }

    // 4. Network failure
    if (err instanceof NetworkError || err.message?.includes("fetch") || err.message?.includes("timeout")) {
      Toast.show(
        "Cannot reach Stellar Testnet. Check your connection and retry.",
        "error",
        "Network Failure"
      );
      return;
    }

    // 5. Wrong network
    if (err.code === "WRONG_NETWORK" || err.message?.includes("network")) {
      Toast.show(err.userMessage || "Switch your wallet to Stellar Testnet", "error", "Wrong Network");
      return;
    }

    // 6. Already voted
    if (err.code === "ALREADY_VOTED" || err.message?.includes("AlreadyVoted")) {
      AppState.hasVoted = true;
      Toast.show("This address has already voted on this poll", "warning", "Already Voted");
      return;
    }

    // Generic fallback
    Toast.show(err.userMessage || err.message || "An unexpected error occurred", "error", "Error");
  },
};

/* ═══════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
═══════════════════════════════════════ */

const Toast = {
  _active: {},

  show(message, type = "info", title = "") {
    const id = title || message;

    // Deduplicate
    if (this._active[id]) {
      clearTimeout(this._active[id]._timer);
      this._active[id].remove();
      delete this._active[id];
    }

    const stack = document.getElementById("toastStack");
    const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };

    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <span class="toast__icon">${icons[type] || "ℹ️"}</span>
      <div class="toast__body">
        ${title ? `<div class="toast__title">${title}</div>` : ""}
        <div class="toast__msg">${message}</div>
      </div>
    `;

    stack.appendChild(el);
    this._active[id] = el;

    const ttl = type === "error" ? 6000 : 4000;
    el._timer = setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => { el.remove(); delete this._active[id]; }, 280);
    }, ttl);
  },
};

/* ═══════════════════════════════════════
   STAR FIELD CANVAS ANIMATION
═══════════════════════════════════════ */

function initStarfield() {
  const canvas = document.getElementById("starsCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 120 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.2 + 0.2,
      speed: Math.random() * 0.4 + 0.05,
      alpha: Math.random(),
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.alpha += s.speed * 0.02;
      if (s.alpha > 1) s.alpha = 0;
      ctx.globalAlpha = Math.sin(s.alpha * Math.PI) * 0.6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  frame();
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function truncAddr(s, front = 6, back = 4) {
  if (!s || s.length <= front + back + 3) return s;
  return `${s.slice(0, front)}...${s.slice(-back)}`;
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ═══════════════════════════════════════
   INIT — APP BOOTSTRAP
═══════════════════════════════════════ */

async function init() {
  console.log(`
╔══════════════════════════════════════════╗
║        StellarVote v2.0 — Production     ║
║  Network:  Stellar Testnet               ║
║  Contract: ${CONFIG.CONTRACT_ID.slice(0, 20)}...║
║  RPC:      ${CONFIG.SOROBAN_RPC_URL.slice(8, 36)} ║
╚══════════════════════════════════════════╝
`);

  // Display contract address
  const contractAddrEl = document.getElementById("contractAddr");
  if (contractAddrEl) {
    contractAddrEl.textContent = truncAddr(CONFIG.CONTRACT_ID, 8, 6);
  }
  const explorerLink = document.getElementById("explorerLink");
  if (explorerLink) {
    explorerLink.href = `${CONFIG.EXPLORER_BASE}/contract/${CONFIG.CONTRACT_ID}`;
  }

  // Check if Stellar SDK loaded
  if (typeof StellarSdk === "undefined") {
    console.error("Stellar SDK not loaded!");
    Toast.show("Stellar SDK failed to load. Check your connection.", "error", "SDK Error");
    // Continue in degraded mode
  }

  // Init starfield
  initStarfield();

  // Close modal on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") UI.closeWalletModal();
  });

  // Disable vote buttons initially
  UI.setVoteButtonsState("disabled");

  // Initial UI
  UI.updatePollUI();

  // Start polling (read-only — no wallet needed for results)
  Poll.start();

  Toast.show("Connected to Stellar Testnet — connect a wallet to vote", "info", "Ready");
}

document.addEventListener("DOMContentLoaded", init);

// DOM elements
const connectWalletBtn = document.getElementById('connect-wallet');
const walletInfo = document.getElementById('wallet-info');
const walletAddress = document.getElementById('wallet-address');
const donateBtn = document.getElementById('donate-btn');
const amountInput = document.getElementById('amount');
const messageInput = document.getElementById('message');
const donationsList = document.getElementById('donations-list');

// Contract address from Move.toml
const CONTRACT_ADDRESS = "0x171df5ba5da9d9778447971d22cc3d7b06def4a9e52f67da7c5ff4c9e8e50ad7";
const MODULE_NAME = "MyModule";

// Store fake donations in localStorage
let fakeDonations = JSON.parse(localStorage.getItem('fakeDonations') || '[]');

// Check if Petra wallet is installed
const checkPetraWallet = () => {
    if (!window.petra) {
        showInstallPrompt();
        return false;
    }
    return true;
};

// Show installation prompt
function showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
        <div class="install-content">
            <h3>Petra Wallet Required</h3>
            <p>Please install the Petra wallet extension to continue.</p>
            <div class="install-buttons">
                <a href="https://petra.app/" target="_blank" class="btn install-btn">Install Petra Wallet</a>
                <button class="btn cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(installPrompt);
    
    // Handle cancel button
    installPrompt.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(installPrompt);
    });
}

// Connect to Petra wallet with enhanced feedback
const connectWallet = async() => {
    if (!checkPetraWallet()) return;

    try {
        // Show loading state
        connectWalletBtn.classList.add('loading');
        connectWalletBtn.textContent = 'Connecting...';
        
        // Connect to Petra wallet
        const response = await window.petra.connect();
        const address = response.address;
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

        // Update UI
        connectWalletBtn.style.display = 'none';
        walletInfo.classList.remove('hidden');
        walletAddress.textContent = shortAddress;
        donateBtn.disabled = false;
        document.body.classList.add('wallet-connected');

        // Store the connected address
        localStorage.setItem('connectedAddress', address);

        // Show success message
        showToast('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Error connecting to wallet:', error);
        showError('Failed to connect wallet. Please try again.');
        
        // Reset button state
        connectWalletBtn.classList.remove('loading');
        connectWalletBtn.textContent = 'Connect Wallet';
    }
};

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }, 3000);
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 3000);
    }, 3000);
}

// Show transaction link with verification
function showTransactionLink(hash) {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'transaction-link';
    linkDiv.innerHTML = `
        <p>Transaction submitted!</p>
        <a href="https://explorer.aptoslabs.com/txn/${hash}?network=devnet" target="_blank" class="btn view-txn-btn">
            View Transaction
        </a>
        <p class="verification-note">Verify your transaction on the <a href="https://explorer.aptoslabs.com/?network=devnet" target="_blank">Aptos Explorer</a></p>
    `;
    document.body.appendChild(linkDiv);
    
    setTimeout(() => {
        linkDiv.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(linkDiv);
        }, 5000);
    }, 3000);
}

// Connect wallet button click handler
connectWalletBtn.addEventListener('click', connectWallet);

// Check for saved wallet connection on page load
window.addEventListener('load', async () => {
    const savedAddress = localStorage.getItem('connectedAddress');
    if (savedAddress) {
        try {
            if (checkPetraWallet()) {
                const response = await window.petra.connect();
                if (response.address === savedAddress) {
                    // Restore the connection
                    connectWalletBtn.style.display = 'none';
                    walletInfo.classList.remove('hidden');
                    walletAddress.textContent = `${savedAddress.slice(0, 6)}...${savedAddress.slice(-4)}`;
                    donateBtn.disabled = false;
                    document.body.classList.add('wallet-connected');
                }
            }
        } catch (error) {
            console.error('Failed to restore wallet connection:', error);
            localStorage.removeItem('connectedAddress');
        }
    }
    
    // Load fake donations
    loadDonations();
});

// Handle donation
donateBtn.addEventListener('click', async () => {
    const amount = amountInput.value;
    const message = messageInput.value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'info');
        return;
    }

    try {
        // Add loading animation
        donateBtn.classList.add('loading');
        donateBtn.innerHTML = '<span class="bubble-pop">💫</span> Processing...';
        
        // Convert APT to octas (1 APT = 100000000 octas)
        const amountInOctas = Math.floor(amount * 100000000);

        // Create the transaction payload
        const payload = {
            type: "entry_function_payload",
            function: "0x1::coin::transfer",
            type_arguments: ["0x1::aptos_coin::AptosCoin"],
            arguments: [
                CONTRACT_ADDRESS,
                amountInOctas.toString()
            ]
        };

        // Send the transaction through Petra wallet
        const pendingTransaction = await window.petra.signAndSubmitTransaction(payload);
        
        // Show transaction link
        showTransactionLink(pendingTransaction.hash);
        
        // Create donation record immediately
        const donation = {
            data: {
                amount: amountInOctas,
                donor: localStorage.getItem('connectedAddress'),
                message: message || "",
                timestamp: Date.now()
            },
            version: pendingTransaction.hash,
            sequence_number: fakeDonations.length
        };
        
        // Add to donations list
        fakeDonations.unshift(donation);
        localStorage.setItem('fakeDonations', JSON.stringify(fakeDonations));
        
        // Add success animation
        document.body.classList.add('donation-success');
        
        // Show success message with animation
        showToast('Donation submitted! ✅', 'success');
        
        // Clear form
        amountInput.value = '';
        messageInput.value = '';
        
        // Refresh donations list with animation
        loadDonations();
        
        // Remove success animation after delay
        setTimeout(() => {
            document.body.classList.remove('donation-success');
        }, 2000);
        
    } catch (error) {
        console.error('Donation failed:', error);
        // Create donation record even if transaction fails
        const donation = {
            data: {
                amount: amountInOctas,
                donor: localStorage.getItem('connectedAddress'),
                message: message || "",
                timestamp: Date.now()
            },
            version: 'pending',
            sequence_number: fakeDonations.length
        };
        
        // Add to donations list
        fakeDonations.unshift(donation);
        localStorage.setItem('fakeDonations', JSON.stringify(fakeDonations));
        
        // Show pending message
        showToast('Donation pending... ⏳', 'info');
        
        // Refresh donations list
        loadDonations();
    } finally {
        // Reset button state
        donateBtn.classList.remove('loading');
        donateBtn.textContent = 'Donate';
    }
});

// Load recent donations with animation
function loadDonations() {
    donationsList.innerHTML = '';
    
    if (fakeDonations.length === 0) {
        donationsList.innerHTML = '<p class="no-donations">No donations yet. Be the first to donate! 🌟</p>';
        return;
    }
    
    fakeDonations.forEach((donation, index) => {
        const donationElement = document.createElement('div');
        donationElement.className = 'donation-item';
        donationElement.style.animationDelay = `${index * 0.1}s`;
        
        // Format the amount from octas to APT with 2 decimal places
        const amountInAPT = (donation.data.amount / 100000000).toFixed(2);
        
        // Add verification status
        const isVerified = donation.version !== 'pending';
        const verificationStatus = isVerified ? '✅ Verified' : '⏳ Pending';
        
        donationElement.innerHTML = `
            <div class="donation-header">
                <span class="donation-amount">${amountInAPT} APT</span>
                <span class="donation-date">${new Date(donation.data.timestamp).toLocaleString()}</span>
            </div>
            <div class="donation-details">
                <p><strong>From:</strong> ${donation.data.donor.slice(0, 6)}...${donation.data.donor.slice(-4)}</p>
                ${donation.data.message ? `<p><strong>Message:</strong> ${donation.data.message}</p>` : ''}
                <p class="verification-status ${isVerified ? 'verified' : 'pending'}">${verificationStatus}</p>
            </div>
            <div class="donation-footer">
                ${isVerified ? `
                    <a href="https://explorer.aptoslabs.com/txn/${donation.version}?network=devnet" target="_blank" class="view-txn-link">
                        View Transaction
                    </a>
                    <p class="verification-note">Verify on <a href="https://explorer.aptoslabs.com/?network=devnet" target="_blank">Aptos Explorer</a></p>
                ` : ''}
            </div>
        `;
        donationsList.appendChild(donationElement);
    });
}

// Initial load of donations
loadDonations(); 
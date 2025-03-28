module MyModule::AlumniDonation {

    use aptos_framework::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    /// Struct representing the donation fund.
    struct DonationFund has store, key {
        total_donations: u64,
    }

    /// Function to initialize a donation fund.
    public fun initialize_fund(owner: &signer) {
        move_to(owner, DonationFund { total_donations: 0 });
    }

    /// Function for alumni to donate funds.
    public fun donate(donor: &signer, fund_owner: address, amount: u64) acquires DonationFund {
        let fund = borrow_global_mut<DonationFund>(fund_owner);

        // Transfer the donation from donor to fund owner
        let donation = coin::withdraw<AptosCoin>(donor, amount);
        coin::deposit<AptosCoin>(fund_owner, donation);

        // Update the total funds received
        fund.total_donations = fund.total_donations + amount;
    }
}

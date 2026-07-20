const BASE_URL = 'http://localhost:3000/api/v1';

async function fetchJSON(url, options = {}) {
  const res = await fetch(BASE_URL + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data.data;
}

async function run() {
  console.log('==========================================');
  console.log('🚀 Starting DemoCredit E2E Flow Test 🚀');
  console.log('==========================================\n');

  try {
    const timestamp = Date.now();
    const user1Email = `sender${timestamp}@example.com`;
    const user2Email = `receiver${timestamp}@example.com`;

    // 1. Register User 1
    console.log(`[1] Registering User 1 (${user1Email})...`);
    const user1Res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: user1Email,
        password: 'Password123!',
        firstName: 'Alice',
        lastName: 'Sender',
      }),
    });
    const token1 = user1Res.accessToken;
    console.log('    ✅ User 1 registered successfully.');

    // 2. Register User 2
    console.log(`\n[2] Registering User 2 (${user2Email})...`);
    const user2Res = await fetchJSON('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: user2Email,
        password: 'Password123!',
        firstName: 'Bob',
        lastName: 'Receiver',
      }),
    });
    const token2 = user2Res.accessToken;
    console.log('    ✅ User 2 registered successfully.');

    // 3. Fund User 1's Wallet
    console.log('\n[3] Funding User 1 Wallet with 5000.00...');
    const fundRes = await fetchJSON('/wallets/fund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ amount: '5000' }),
    });
    console.log('    ✅ Wallet funded successfully. Balance:', fundRes.balance);

    // 4. Get User 2's Wallet ID
    console.log('\n[4] Fetching User 2 Wallet ID...');
    const wallet2Res = await fetchJSON('/wallets/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    const wallet2Id = wallet2Res.id;
    console.log('    ✅ User 2 Wallet ID:', wallet2Id);
    
    // Get User 1's Wallet ID
    const wallet1Res = await fetchJSON('/wallets/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const wallet1Id = wallet1Res.id;

    // 5. Transfer Funds from User 1 to User 2
    console.log('\n[5] Transferring 1500.00 from User 1 to User 2...');
    const transferRes = await fetchJSON('/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token1}`,
        'Idempotency-Key': `idem-${timestamp}`,
      },
      body: JSON.stringify({
        fromWalletId: wallet1Id,
        toWalletId: wallet2Id,
        amount: '1500.0000',
      }),
    });
    console.log('    ✅ Transfer successful. Status:', transferRes.status);

    // 6. Check Final Balances
    console.log('\n[6] Checking final balances...');
    const finalWallet1 = await fetchJSON('/wallets/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const finalWallet2 = await fetchJSON('/wallets/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });

    console.log('    💰 User 1 Final Balance:', finalWallet1.balance);
    console.log('    💰 User 2 Final Balance:', finalWallet2.balance);

    console.log('\n🎉 End to end flow completed successfully! 🎉');
  } catch (err) {
    console.error('\n❌ Flow failed with error:', err.message);
  }
}

run();

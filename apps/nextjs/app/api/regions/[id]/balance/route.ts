import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

const regionalDonationAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "regionalBalances",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const regionId = parseInt(params.id, 10);

  if (isNaN(regionId)) {
    return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });
  }

  if (!regionalDonationContractAddress) {
    console.error("La dirección del contrato RegionalDonation no está configurada.");
    return NextResponse.json({ error: 'Donation contract not configured' }, { status: 500 });
  }

  try {
    const balance = await publicClient.readContract({
      address: regionalDonationContractAddress,
      abi: regionalDonationAbi,
      functionName: 'regionalBalances',
      args: [BigInt(regionId)],
    });

    // USDT has 6 decimals
    const balanceInUSD = formatUnits(balance, 6);

    return NextResponse.json({ balance: balanceInUSD });
  } catch (error) {
    console.error('Error fetching region balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}

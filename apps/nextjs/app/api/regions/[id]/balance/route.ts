import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { celoSepolia, celo } from 'viem/chains';

import regionalDonationAbi from '@/abis/RegionalDonation.json'

const regionalDonationContractAddress = process.env.NEXT_PUBLIC_REGIONALDONATION_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
  chain: process.env.NEXT_PUBLIC_NETWORK == 'celoSepolia' ? celoSepolia : celo,
  transport: http(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const regionId = parseInt(params.id, 10);
  console.log("OJO balance regionId=", regionId)

  if (isNaN(regionId)) {
    return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });
  }

  if (!regionalDonationContractAddress) {
    console.error("La dirección del contrato RegionalDonation no está configurada.");
    return NextResponse.json({ error: 'Donation contract not configured' }, { status: 500 });
  }

  try {
    console.log("OJO publicClient=", publicClient)
    console.log("Por llamar balance")
    const balance = await publicClient.readContract({
      address: regionalDonationContractAddress,
      abi: regionalDonationAbi,
      functionName: 'regionalBalances',
      args: [BigInt(regionId)],
    });
    console.log("balance=", balance)

    // USDT has 6 decimals
    const balanceInUSD = formatUnits(balance as bigint, 6);
    console.log("balanceInUSD=", balanceInUSD)

    return NextResponse.json({ balance: balanceInUSD });
  } catch (error) {
    console.error('Error fetching region balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}

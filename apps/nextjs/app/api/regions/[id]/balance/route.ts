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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const regionId = parseInt(id, 10);
  console.log("🔍 [Balance API] Región:", regionId)

  if (isNaN(regionId)) {
    return NextResponse.json({ error: 'Invalid region ID' }, { status: 400 });
  }

  if (!regionalDonationContractAddress) {
    console.error("❌ [Balance API] Contrato no configurado");
    return NextResponse.json({ error: 'Donation contract not configured' }, { status: 500 });
  }

  try {
    // Forzar actualización agregando timestamp para evitar caché
    const cacheBuster = Date.now();
    console.log(`🔍 [Balance API] Consultando balance con cacheBuster: ${cacheBuster}`);
    
    const balance = await publicClient.readContract({
      address: regionalDonationContractAddress,
      abi: regionalDonationAbi,
      functionName: 'regionalBalances',
      args: [BigInt(regionId)],
    });
    
    const balanceInUSD = formatUnits(balance as bigint, 6);
    console.log(`✅ [Balance API] Balance región ${regionId}: ${balanceInUSD} USDT`);

    // Agregar headers para evitar caché
    return NextResponse.json({ balance: balanceInUSD, timestamp: cacheBuster }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('❌ [Balance API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}

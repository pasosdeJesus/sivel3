import type { NextConfig } from 'next';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the centralized .env file from the parent directory.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// sivel3's own contracts resolve from apps/contracts/deployments/<Contract>/<Version>/<network>.json
// (a deployment file wins over any env var; the canonical defaults in
// lib/contractAddresses.ts cover checkouts/servers without those files).
// This runs here because only the Node-side config can read the files; the
// resulting values are inlined by Next for both server and browser code.
const DEPLOYMENT_ADDRESSES: Array<[contract: string, version: string, envVar: string]> = [
  ['SIVeL3PreAlertMarket', 'V1', 'NEXT_PUBLIC_PREALERT_MARKET_ADDRESS'],
  ['SIVeL3RewardEscrow', 'V1', 'NEXT_PUBLIC_REWARD_ESCROW_ADDRESS'],
  ['SIVeL3RegionalDonationV2', 'V1', 'NEXT_PUBLIC_REGIONALDONATION_ADDRESS'],
];
const deploymentNetwork =
  process.env.NEXT_PUBLIC_NETWORK === 'celo' ? 'celo' : 'celoSepolia';
const deploymentsDir = path.resolve(__dirname, '..', 'contracts', 'deployments');

for (const [contract, version, envVar] of DEPLOYMENT_ADDRESSES) {
  for (const file of [
    path.join(deploymentsDir, contract, version, `${deploymentNetwork}.json`),
    path.join(deploymentsDir, contract, `${deploymentNetwork}.json`),
  ]) {
    if (!fs.existsSync(file)) continue;
    try {
      const { address } = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (address) process.env[envVar] = address;
    } catch (err) {
      console.warn(`[next.config] unreadable deployment file ${file}:`, err);
    }
    break;
  }
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['sivel.xyz', '127.0.0.1'],
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      '@x402/core': false,
      '@x402/core/client': false,
      '@x402/evm': false,
      '@x402/evm/exact/client': false,
      '@x402/evm/upto/client': false,
      '@x402/svm/exact/client': false,
    }
    return config
  },
}

export default nextConfig

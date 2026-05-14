#!/usr/bin/env node
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateWallet() {
    const wallet = ethers.Wallet.createRandom();
    
    console.log('\n✅ NUEVA BILLETERA GENERADA\n');
    console.log('📌 Dirección pública:');
    console.log(wallet.address);
    console.log('\n🔑 Clave privada:');
    console.log(wallet.privateKey);
    console.log('\n📝 Frase mnemotécnica:');
    console.log(wallet.mnemonic.phrase);
    
    // Guardar en .env (opcional)
    const envPath = path.join(__dirname, '../apps/nextjs/.env');
    const envContent = `\n# SBT Admin Wallet (generada el ${new Date().toISOString()})\nSBT_ADMIN_PRIVATE_KEY="${wallet.privateKey}"\nSBT_ADMIN_ADDRESS="${wallet.address}"\n`;
    
    if (fs.existsSync(envPath)) {
        fs.appendFileSync(envPath, envContent);
        console.log(`\n💾 Claves añadidas a: ${envPath}`);
    } else {
        console.log(`\n⚠️ No se encontró .env en ${envPath}`);
        console.log('Agrega manualmente estas líneas:\n');
        console.log(`SBT_ADMIN_PRIVATE_KEY="${wallet.privateKey}"`);
        console.log(`SBT_ADMIN_ADDRESS="${wallet.address}"`);
    }
    
    console.log('\n⚠️ GUARDA LA FRASE MNEMOTÉCNICA EN UN LUGAR SEGURO (no está en el .env).\n');
}

generateWallet();

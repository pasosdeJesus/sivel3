#!/usr/bin/env node
import { ethers } from 'ethers';
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
    
    // Mostrar cómo agregar al .env unificado
    const envPath = path.join(__dirname, '../../.env');
    console.log(`\n💡 Agrega estas líneas a ${envPath}:\n`);
    console.log(`# Admin wallet (generada el ${new Date().toISOString()})`);
    console.log(`ADMIN_PRIVATE_KEY="${wallet.privateKey}"`);
    console.log(`ADMIN_ADDRESS="${wallet.address}"`);
    console.log(`\n⚠️ GUARDA LA FRASE MNEMOTÉCNICA EN UN LUGAR SEGURO (no en el .env).\n`);
}

generateWallet();

// cspell:disable
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { networkInterfaces } = require('os');

function getLocalIp() {
  const nets = networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  const isHomeLan = (ip) =>
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
  return results.find(isHomeLan) || results[0] || 'localhost';
}

function updateEnv(tunnelUrl, localIp) {
  const envPath = path.resolve(__dirname, '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');

    const vnpUrlPattern = /^(VNP_RETURN_URL=).*$/m;
    const momoUrlPattern = /^(MOMO_IPN_URL=).*$/m;
    const frontendUrlPattern = /^(FRONTEND_URL=).*$/m;

    const newVnpUrl = `${tunnelUrl}/api/payment/vnpay/vnpay-return`;
    const newMomoUrl = `${tunnelUrl}/api/payment/momo/ipn`;
    const newFrontendUrl = `http://${localIp}:3000`;

    if (vnpUrlPattern.test(envContent)) {
      envContent = envContent.replace(vnpUrlPattern, `$1${newVnpUrl}`);
    } else {
      envContent += `\nVNP_RETURN_URL=${newVnpUrl}`;
    }

    if (momoUrlPattern.test(envContent)) {
      envContent = envContent.replace(momoUrlPattern, `$1${newMomoUrl}`);
    } else {
      envContent += `\nMOMO_IPN_URL=${newMomoUrl}`;
    }

    if (frontendUrlPattern.test(envContent)) {
      envContent = envContent.replace(
        frontendUrlPattern,
        `$1${newFrontendUrl}`,
      );
    } else {
      envContent += `\nFRONTEND_URL=${newFrontendUrl}`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(
      'Updated .env file with new Cloudflare Tunnel URLs for VNPAY & MoMo.',
    );
    console.log(`Updated FRONTEND_URL to ${newFrontendUrl} for mobile access.`);
  } else {
    console.warn('.env file not found. Could not update URLs.');
  }
}

async function main() {
  console.log('Starting Cloudflare Tunnel (NO Phishing Warnings)...');

  let tunnelUrl = '';
  const localIp = getLocalIp();

  const exePath = path.join(__dirname, 'cloudflared.exe');
  if (!fs.existsSync(exePath)) {
    console.error(`ERROR: Could not find ${exePath}. Please download it.`);
    process.exit(1);
  }

  // Spawn isolated cloudflared tunnel
  const tunnelProcess = spawn(exePath, [
    'tunnel',
    '--url',
    `http://localhost:${process.env.PORT || 9999}`,
  ]);

  let isNestjsStarted = false;

  const startNestJs = () => {
    if (isNestjsStarted) return;
    isNestjsStarted = true;

    console.log('\n[INFO] 🚀 Starting NestJS Backend...\n');

    const args = process.argv.slice(2);
    let runArgs = ['start'];
    if (args.includes('dev')) {
      runArgs = ['start', '--watch'];
    } else if (args.includes('debug')) {
      runArgs = ['start', '--debug', '--watch'];
    }

    const nestProcess = spawn('npx', ['nest', ...runArgs], {
      stdio: 'inherit',
      shell: true,
    });

    nestProcess.on('close', (code) => {
      tunnelProcess.kill();
      process.exit(code);
    });
  };

  const handleUrlOutput = (data) => {
    const output = data.toString();

    // Parse Cloudflare Quick Tunnel URL: https://some-random-words.trycloudflare.com
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];

      console.log(`\n======================================================`);
      console.log(`TUNNEL CREATED (Clean): ${tunnelUrl}`);
      console.log(`FRONTEND LAN IP       : http://${localIp}:3000`);
      console.log(`======================================================\n`);

      updateEnv(tunnelUrl, localIp);
      startNestJs();
    }
  };

  // cloudflared logs tunnel info primarily to stderr
  tunnelProcess.stderr.on('data', handleUrlOutput);
  tunnelProcess.stdout.on('data', handleUrlOutput);

  tunnelProcess.on('error', (err) => {
    console.warn(
      'Failed to start Cloudflared Tunnel. Webhooks will not work externally.',
    );
    console.warn(`Error: ${err.message}`);
    startNestJs();
  });

  tunnelProcess.on('close', (code) => {
    if (!tunnelUrl) {
      console.warn(
        'Tunnel closed before URL could be retrieved. Working locally only.',
      );
      startNestJs();
    }
  });

  // Fallback: If tunnel doesn't respond in 15 seconds, just start NestJS
  setTimeout(() => {
    if (!tunnelUrl && !isNestjsStarted) {
      console.warn('Tunnel took too long to connect. Starting without tunnel.');
      startNestJs();
    }
  }, 15000);
}

main();

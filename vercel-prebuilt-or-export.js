const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_BUNDLE_DIR = path.join('dist', 'client', '_expo', 'static', 'js', 'web');
const SERVER_HTML_SAMPLE = path.join('dist', 'server', '(tabs)', 'index.html');

function getClientEntryBundles() {
  if (!fs.existsSync(CLIENT_BUNDLE_DIR)) {
    return [];
  }

  return fs.readdirSync(CLIENT_BUNDLE_DIR).filter(
    (file) => file.startsWith('entry-') && file.endsWith('.js'),
  );
}

function serverHtmlReferencesBundle(bundleName) {
  if (!fs.existsSync(SERVER_HTML_SAMPLE)) {
    return true;
  }

  const html = fs.readFileSync(SERVER_HTML_SAMPLE, 'utf8');
  return html.includes(bundleName);
}

function isDistComplete() {
  if (!fs.existsSync('dist/server')) {
    return false;
  }

  const bundles = getClientEntryBundles();
  if (bundles.length === 0) {
    return false;
  }

  return serverHtmlReferencesBundle(bundles[0]);
}

function verifyDist() {
  const bundles = getClientEntryBundles();
  if (bundles.length === 0) {
    console.error(`ERROR: No client entry bundles found in ${CLIENT_BUNDLE_DIR}`);
    process.exit(1);
  }

  if (!serverHtmlReferencesBundle(bundles[0])) {
    console.error(`ERROR: Server HTML does not reference client bundle ${bundles[0]}`);
    process.exit(1);
  }

  console.log(`Verified client bundle: ${bundles[0]}`);
}

const forceBuild = process.env.VERCEL === '1' || process.env.FORCE_VERCEL_BUILD === '1';
const shouldBuild = forceBuild || !isDistComplete();

if (shouldBuild) {
  if (forceBuild && fs.existsSync('dist')) {
    console.log('Cleaning dist/ for a fresh export');
    fs.rmSync('dist', { recursive: true, force: true });
  }

  console.log('Running full build:web (expo export -p web)');
  execSync('npm run build:web', { stdio: 'inherit' });
} else {
  console.log('Using prebuilt dist/');
}

verifyDist();

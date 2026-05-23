import { execSync } from 'node:child_process';

try {
  execSync('cross-env --version', { stdio: 'ignore' });
} catch (e) {
  console.log('cross-env not found. Installing globally or in workspace...');
  try {
    // Try to install it in the root workspace
    execSync('pnpm add -wD cross-env', { stdio: 'inherit' });
    console.log('cross-env installed successfully.');
  } catch (err) {
    console.error('Failed to install cross-env. Please install it manually with "pnpm add -wD cross-env"');
    process.exit(1);
  }
}

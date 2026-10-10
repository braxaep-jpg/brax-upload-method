export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tiktokvideooptimizer.com';
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_MODE = import.meta.env.VITE_STRIPE_MODE || 'test';
export const CRYPTO_WALLETS = {
  usdtTrc20: import.meta.env.VITE_CRYPTO_USDT_TRC20 || 'TVG1iA3EYfeNF2gvvVXsJjSXHi44ykU7MD',
  eth: import.meta.env.VITE_CRYPTO_ETH || '0x0edD3bAf8084f527c808d834dC65Aa35CCDcb21e',
  btc: import.meta.env.VITE_CRYPTO_BTC || 'bc1qysnqm87jt6v2k35ncl5hp22qap9n7z2gn8284l'
} as const;

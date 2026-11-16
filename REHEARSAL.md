# United Reserve rehearsal fork

Upstream: https://github.com/eternalsafe/wallet, commit 6d0863a6f733ac46a0ed5efb2fe28cb48e7abea2. GPL-3.0 license and upstream notices retained.

This build exposes only chain 7311026 and its fork RPC. Safe deployment lookup metadata aliases Ethereum mainnet addresses; signing uses the actual fork chain ID. No production chain is selected. New Safes do not acquire protocol ownership automatically.

Build: `corepack yarn install --frozen-lockfile`, then `NEXT_PUBLIC_IS_PRODUCTION=true corepack yarn build`. Deploy the static `out` directory. The app embeds this separately built wallet at /safe and provides a direct-open fallback for wallets that disallow iframe access.

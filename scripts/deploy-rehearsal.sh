#!/usr/bin/env bash
set -euo pipefail
NEXT_PUBLIC_IS_PRODUCTION=true corepack yarn build
cp vercel.static.json out/vercel.json
cp LICENSE out/LICENSE.txt
cp REHEARSAL.md out/REHEARSAL.md
mkdir -p out/.vercel
cat > out/.vercel/project.json <<'JSON'
{"projectId":"prj_p1PSiEf4a8XJzs2MpYR25UYxSsza","orgId":"team_74jbMZvYhecDbXKAW36AVVLZ","projectName":"united-reserve-rehersal-safe"}
JSON
vercel deploy out --prod --yes --scope chapter3

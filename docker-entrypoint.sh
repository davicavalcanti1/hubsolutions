#!/bin/sh
set -e

# Generate /usr/share/nginx/html/env.js with runtime environment variables.
# The frontend reads window._env_ before falling back to import.meta.env.

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

cat > /usr/share/nginx/html/env.js << EOF
window._env_ = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
};
EOF

exec nginx -g "daemon off;"

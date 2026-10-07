#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
organization_test_container="rmaiig-organization-test-$$"
organization_test_sql="$(mktemp)"
trap 'docker rm -f "$organization_test_container" >/dev/null 2>&1; rm -f "$organization_test_sql"' EXIT
docker run -d --name "$organization_test_container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:15-alpine >/dev/null
organization_test_attempt=0
until docker exec "$organization_test_container" pg_isready -U postgres >/dev/null 2>&1; do
  organization_test_attempt=$((organization_test_attempt+1))
  [ "$organization_test_attempt" -lt 30 ] || exit 1
  sleep 1
done
cat tests/sql/supabase-test-bootstrap.sql > "$organization_test_sql"
for organization_test_migration in supabase/migrations/*.sql; do
  case "$organization_test_migration" in
    *organization_identity_roles.sql) break ;;
  esac
  cat "$organization_test_migration" >> "$organization_test_sql"
  printf '\n' >> "$organization_test_sql"
done
cat tests/sql/organization-fixtures.sql >> "$organization_test_sql"
organization_test_features=false
for organization_test_migration in supabase/migrations/*.sql; do
  case "$organization_test_migration" in
    *organization_identity_roles.sql) organization_test_features=true ;;
  esac
  if [ "$organization_test_features" = true ]; then
    cat "$organization_test_migration" >> "$organization_test_sql"
    printf '\n' >> "$organization_test_sql"
  fi
done
cat tests/sql/organization-model.sql >> "$organization_test_sql"
docker exec -i "$organization_test_container" psql -q -U postgres -v ON_ERROR_STOP=1 < "$organization_test_sql"
printf 'Organization migration and PostgreSQL integration tests passed.\n'

## Summary

What changes, and why it helps template users.

## Validation

- [ ] `pnpm verify` (in `website/`)
- [ ] `pnpm test:e2e` (in `website/`)
- [ ] `terraform fmt -recursive && terraform validate && terraform test` (if `infrastructure/` changed)

## Checklist

- [ ] Tests added or updated for the new behavior.
- [ ] Documentation updated when setup, configuration or behavior changed.
- [ ] No `.env`, `deploy.env`, Terraform state, zips, account IDs or secrets.
- [ ] Generic enough for a reusable template.
- [ ] Screenshots for visible UI changes.

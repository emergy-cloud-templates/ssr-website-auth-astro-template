## Summary

Describe the change and why it helps template users.

## Validation

- [ ] `pnpm --dir website build`
- [ ] `pnpm --dir website test:ssr`
- [ ] `terraform -chdir=infrastructure fmt -recursive` if Terraform changed

## Checklist

- [ ] I updated documentation when setup or behavior changed.
- [ ] I did not commit `.env`, Terraform state, generated zips, account IDs, or secrets.
- [ ] I kept the change generic enough for a reusable template.
- [ ] I included screenshots for visible UI changes.

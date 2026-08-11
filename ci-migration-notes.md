# CI Migration Notes

The project now uses GitHub Actions instead of Jenkins.

Removed:

- `Jenkinsfile`

Added:

- `.github/workflows/deploy-azure.yml`
- `.github/workflows/README.md`

Reason:

- No Jenkins server to run or secure
- Uses GitHub OIDC with Azure instead of storing long-lived Azure client secrets
- Simpler for a student/local testing workflow

# GitHub Actions Azure Deployment

This project deploys to Azure AKS using GitHub Actions instead of Jenkins.

## Required GitHub secrets

Add these in GitHub:

```txt
Repository → Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:

```txt
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Current values you already know:

```txt
AZURE_TENANT_ID=c69f3e39-8601-43c0-b0a6-115746c7f8c6
AZURE_SUBSCRIPTION_ID=8997fd12-ba29-4693-af88-73b2e302d9de
```

`AZURE_CLIENT_ID` comes from the Azure App Registration / Service Principal used by GitHub Actions.

## Recommended auth: OIDC

This workflow uses Azure OIDC login, which is safer than storing an Azure client secret in GitHub.

It requires a Service Principal / App Registration with a federated credential that trusts this GitHub repo.

Example setup:

```bash
az ad app create --display-name demo-credit-github-actions
```

Get the app id:

```bash
APP_ID=$(az ad app list --display-name demo-credit-github-actions --query '[0].appId' -o tsv)
```

Create service principal:

```bash
az ad sp create --id $APP_ID
```

Create federated credential for pushes to `main`:

```bash
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:sodiqscript111/Demo-credit:ref:refs/heads/main",
    "description": "GitHub Actions main branch deploy",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

Then give the service principal permissions.

## Required Azure roles

Set these roles for the GitHub Actions service principal:

### ACR push

```bash
ACR_ID=$(az acr show --name democreditdev6ho4npacr --query id -o tsv)
az role assignment create \
  --assignee $APP_ID \
  --role AcrPush \
  --scope $ACR_ID
```

### AKS/resource group deployment access

For local/student testing, Contributor on the resource group is simplest:

```bash
RG_ID=$(az group show --name demo-credit-dev-rg --query id -o tsv)
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope $RG_ID
```

For production, reduce this later to narrower roles.

## Deployment flow

On every push to `main`:

```txt
checkout
npm ci
typecheck
test
Azure login via OIDC
build Docker image
push image to ACR
connect to AKS
apply manifests
wait for MySQL
run migration job
deploy API
verify rollout
```

## Manual deploy

You can also run the workflow manually:

```txt
GitHub → Actions → Deploy to Azure AKS → Run workflow
```

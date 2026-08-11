# Azure Terraform Setup

This Terraform setup creates the minimum practical Azure infrastructure for DemoCredit:

- Resource Group
- Virtual Network + AKS subnet + Application Gateway subnet
- Azure Container Registry Basic
- Azure Key Vault Standard
- AKS Free tier with 1 small node by default
- Azure Application Gateway Standard_v2 with autoscale min 0 / max 1
- AKS add-ons:
  - Application Gateway Ingress Controller
  - Key Vault Secrets Store CSI provider

## Cost warning

This is designed to be as small as possible, but it is **not free**.

The main cost drivers are:

1. AKS node VM
2. Application Gateway Standard_v2
3. Public IP
4. ACR storage
5. Managed disks for AKS and MySQL PVC

For Azure Student plans, watch your credits carefully. Destroy resources when done:

```bash
terraform destroy
```

## Why Kubernetes MySQL?

Per the project requirement, MySQL stays inside Kubernetes via `k8s/mysql.yaml`.

For real production, Azure Database for MySQL Flexible Server is safer, but it costs more and is intentionally not used here.

## 1. Login to Azure

```bash
az login
az account set --subscription "<subscription-id>"
```

## 2. Configure Terraform variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
mysql_root_password = "..."
jwt_secret          = "..."
adjutor_api_key     = "..."
```

## 3. Provision Azure infrastructure

```bash
terraform init
terraform plan
terraform apply
```

## 4. Connect kubectl to AKS

```bash
terraform output -raw get_aks_credentials_command
```

Copy and run the command it prints, for example:

```bash
az aks get-credentials --resource-group demo-credit-dev-rg --name demo-credit-dev-aks --overwrite-existing
```

## 5. Build and push Docker image

From the project root:

```bash
ACR_LOGIN_SERVER=$(cd terraform && terraform output -raw acr_login_server)
docker build -t $ACR_LOGIN_SERVER/demo-credit-api:latest .
az acr login --name $(echo $ACR_LOGIN_SERVER | cut -d'.' -f1)
docker push $ACR_LOGIN_SERVER/demo-credit-api:latest
```

On Windows PowerShell, use equivalent variables manually.

## 6. Update Kubernetes image names

Replace `demo-credit:latest` with your ACR image in:

- `k8s/deployment.yaml`
- `k8s/migrations-job.yaml`

Example:

```yaml
image: <acr-login-server>/demo-credit-api:latest
```

## 7. Fill Key Vault CSI placeholders

Terraform outputs these values:

```bash
terraform output -raw key_vault_name
terraform output -raw tenant_id
terraform output -raw key_vault_csi_client_id
```

Use them to replace placeholders in:

```txt
k8s/secret-provider-class.yaml
```

Replace:

```txt
<KEY_VAULT_NAME>
<TENANT_ID>
<KEY_VAULT_CSI_CLIENT_ID>
```

## 8. Deploy Kubernetes resources

From the project root:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret-provider-class.yaml
kubectl apply -f k8s/mysql.yaml

kubectl wait --namespace demo-credit \
  --for=condition=ready pod \
  -l app.kubernetes.io/component=mysql \
  --timeout=300s

kubectl apply -f k8s/migrations-job.yaml

kubectl wait --namespace demo-credit \
  --for=condition=complete job/demo-credit-migrations \
  --timeout=300s

kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

## 9. Test the app

Port-forward:

```bash
kubectl -n demo-credit port-forward svc/demo-credit-api 3000:80
```

Open:

```txt
http://localhost:3000
```

Or use the Application Gateway public IP:

```bash
terraform output -raw application_gateway_public_ip
```

Since the ingress host is `demo-credit.local`, add a hosts-file entry for local testing:

```txt
<APP_GATEWAY_PUBLIC_IP> demo-credit.local
```

Then open:

```txt
http://demo-credit.local
```

## 10. Destroy when done

```bash
terraform destroy
```

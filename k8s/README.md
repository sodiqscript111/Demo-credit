# DemoCredit Kubernetes Manifests

These manifests are intended to run on the AKS cluster created by `terraform/`.

They deploy:

- App namespace
- ConfigMap
- Azure Key Vault SecretProviderClass
- MySQL StatefulSet inside Kubernetes
- Migration Job
- API Deployment
- Service
- Azure Application Gateway Ingress
- HPA

## Important

Secrets are not stored directly in Kubernetes YAML.

Terraform creates these secrets in Azure Key Vault:

- `DB-USER`
- `DB-PASSWORD`
- `JWT-SECRET`
- `ADJUTOR-API-KEY`

`secret-provider-class.yaml` syncs those Key Vault values into a Kubernetes secret named:

```txt
demo-credit-secrets
```

The API, migration Job, and MySQL StatefulSet then consume that Kubernetes secret.

## 1. Provision Azure infrastructure

From the project root:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
terraform init
terraform apply
```

Then connect kubectl:

```bash
terraform output -raw get_aks_credentials_command
```

Run the printed command.

## 2. Build and push image to ACR

Get the ACR login server:

```bash
cd terraform
terraform output -raw acr_login_server
```

Build/push your image from the project root, using the ACR login server.

Example:

```bash
docker build -t <ACR_LOGIN_SERVER>/demo-credit-api:latest .
az acr login --name <ACR_NAME>
docker push <ACR_LOGIN_SERVER>/demo-credit-api:latest
```

Then update the image in:

- `k8s/deployment.yaml`
- `k8s/migrations-job.yaml`

Replace:

```yaml
image: demo-credit:latest
```

with:

```yaml
image: <ACR_LOGIN_SERVER>/demo-credit-api:latest
```

## 3. Fill Key Vault CSI placeholders

Get values from Terraform:

```bash
cd terraform
terraform output -raw key_vault_name
terraform output -raw tenant_id
terraform output -raw key_vault_csi_client_id
```

Replace placeholders in:

```txt
k8s/secret-provider-class.yaml
```

Placeholders:

```txt
<KEY_VAULT_NAME>
<TENANT_ID>
<KEY_VAULT_CSI_CLIENT_ID>
```

## 4. Deploy Kubernetes resources

From the project root:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret-provider-class.yaml
kubectl apply -f k8s/mysql.yaml
```

Wait for MySQL:

```bash
kubectl wait --namespace demo-credit \
  --for=condition=ready pod \
  -l app.kubernetes.io/component=mysql \
  --timeout=300s
```

Run migrations:

```bash
kubectl apply -f k8s/migrations-job.yaml
kubectl wait --namespace demo-credit \
  --for=condition=complete job/demo-credit-migrations \
  --timeout=300s
```

Deploy API + networking:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

## 5. Test locally

Port-forward:

```bash
kubectl -n demo-credit port-forward svc/demo-credit-api 3000:80
```

Open:

```txt
http://localhost:3000
```

## 6. Test through Application Gateway

Get public IP:

```bash
cd terraform
terraform output -raw application_gateway_public_ip
```

The ingress host is:

```txt
demo-credit.local
```

For local testing, add this to your hosts file:

```txt
<APP_GATEWAY_PUBLIC_IP> demo-credit.local
```

Then open:

```txt
http://demo-credit.local
```

## Notes

- `SecretProviderClass` dry-run validation will fail on clusters without the Secrets Store CSI CRD installed.
- The Terraform AKS config enables the Key Vault Secrets Provider add-on, which installs that CRD in AKS.
- HPA requires metrics-server. AKS usually includes it.
- MySQL runs inside Kubernetes for this student/minimum-cost setup. Destroy resources when finished.

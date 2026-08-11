output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "key_vault_csi_client_id" {
  value = azurerm_kubernetes_cluster.aks.key_vault_secrets_provider[0].secret_identity[0].client_id
}

output "application_gateway_public_ip" {
  value = azurerm_public_ip.appgw.ip_address
}

output "get_aks_credentials_command" {
  value = "az aks get-credentials --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_kubernetes_cluster.aks.name} --overwrite-existing"
}

output "container_image_name" {
  value = "${azurerm_container_registry.acr.login_server}/demo-credit-api:latest"
}

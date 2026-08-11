data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

locals {
  compact_name = substr(replace(lower(var.project_name), "-", ""), 0, 12)
  name_prefix  = "${var.project_name}-${var.environment}"
  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}


resource "azurerm_resource_group" "main" {
  name     = "${local.name_prefix}-rg"
  location = var.location
  tags     = local.tags
}


resource "azurerm_virtual_network" "main" {
  name                = "${local.name_prefix}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.20.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.20.1.0/24"]
}

resource "azurerm_subnet" "appgw" {
  name                 = "appgw-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.20.2.0/24"]
}

# ── Container registry ────────────────────────────────────────────────────────
resource "azurerm_container_registry" "acr" {
  name                = "${local.compact_name}${var.environment}${random_string.suffix.result}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

# ── Key Vault ─────────────────────────────────────────────────────────────────
resource "azurerm_key_vault" "main" {
  name                        = "kv-${local.compact_name}-${random_string.suffix.result}"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
  enabled_for_disk_encryption = false
  tags                        = local.tags

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Recover",
      "Purge"
    ]
  }
}

resource "azurerm_key_vault_secret" "db_user" {
  name         = "DB-USER"
  value        = var.db_user
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "DB-PASSWORD"
  value        = var.mysql_root_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "JWT-SECRET"
  value        = var.jwt_secret
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "adjutor_api_key" {
  name         = "ADJUTOR-API-KEY"
  value        = var.adjutor_api_key
  key_vault_id = azurerm_key_vault.main.id
}

# ── Application Gateway ───────────────────────────────────────────────────────
resource "azurerm_public_ip" "appgw" {
  name                = "${local.name_prefix}-appgw-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_application_gateway" "main" {
  name                = "${local.name_prefix}-appgw"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags

  sku {
    name = "Standard_v2"
    tier = "Standard_v2"
  }

  # Lowest valid App Gateway v2 autoscale shape. Still not free — watch Azure costs.
  autoscale_configuration {
    min_capacity = 0
    max_capacity = 2
  }

  gateway_ip_configuration {
    name      = "appgw-ip-config"
    subnet_id = azurerm_subnet.appgw.id
  }

  frontend_port {
    name = "http-port"
    port = 80
  }

  frontend_ip_configuration {
    name                 = "public-frontend"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  backend_address_pool {
    name = "placeholder-backend-pool"
  }

  backend_http_settings {
    name                  = "placeholder-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 30
  }

  http_listener {
    name                           = "placeholder-http-listener"
    frontend_ip_configuration_name = "public-frontend"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "placeholder-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "placeholder-http-listener"
    backend_address_pool_name  = "placeholder-backend-pool"
    backend_http_settings_name = "placeholder-http-settings"
    priority                   = 100
  }

  lifecycle {
    ignore_changes = [
      backend_address_pool,
      backend_http_settings,
      http_listener,
      probe,
      request_routing_rule,
      redirect_configuration,
      url_path_map,
      frontend_port,
      ssl_certificate,
      tags,
    ]
  }
}

# ── AKS ───────────────────────────────────────────────────────────────────────
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${local.name_prefix}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${local.compact_name}-${var.environment}"
  sku_tier            = "Free"
  tags                = local.tags

  default_node_pool {
    name            = "system"
    node_count      = var.aks_node_count
    vm_size         = var.aks_vm_size
    vnet_subnet_id  = azurerm_subnet.aks.id
    os_disk_size_gb = 30
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.21.0.0/16"
    dns_service_ip    = "10.21.0.10"
  }

  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  ingress_application_gateway {
    gateway_id = azurerm_application_gateway.main.id
  }
}

# Allow AKS nodes to pull from ACR.
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
}

# Allow the Key Vault CSI add-on identity to read secrets.
resource "azurerm_key_vault_access_policy" "aks_keyvault_csi" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_kubernetes_cluster.aks.key_vault_secrets_provider[0].secret_identity[0].object_id

  secret_permissions = ["Get", "List"]
}

# AGIC identity needs to manage App Gateway configuration.
resource "azurerm_role_assignment" "agic_appgw_contributor" {
  scope                = azurerm_application_gateway.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_kubernetes_cluster.aks.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
}

# AGIC also needs network permissions for the App Gateway subnet.
resource "azurerm_role_assignment" "agic_network_contributor" {
  scope                = azurerm_virtual_network.main.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.aks.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
}

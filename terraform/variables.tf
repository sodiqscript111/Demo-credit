variable "project_name" {
  description = "Short project name used for resource naming."
  type        = string
  default     = "demo-credit"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region. Choose the closest/cheapest region available to your student subscription."
  type        = string
  default     = "francecentral"
}

variable "aks_node_count" {
  description = "Initial AKS node count. Keep at 1 for student/minimum cost."
  type        = number
  default     = 1
}

variable "aks_vm_size" {
  description = "AKS node VM size. Standard_B2s is a low-cost general starting point."
  type        = string
  default     = "Standard_B2s"
}

variable "mysql_root_password" {
  description = "Password used by the in-cluster MySQL StatefulSet. Stored in Azure Key Vault."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret. Stored in Azure Key Vault."
  type        = string
  sensitive   = true
}

variable "adjutor_api_key" {
  description = "Adjutor/Lendsqr API key. Stored in Azure Key Vault."
  type        = string
  sensitive   = true
}

variable "cors_origin" {
  description = "CORS origin for the API."
  type        = string
  default     = "*"
}

variable "db_name" {
  description = "Application database name created by the MySQL container."
  type        = string
  default     = "democredit"
}

variable "db_user" {
  description = "Application DB user. For the bundled MySQL StatefulSet this defaults to root."
  type        = string
  default     = "root"
}

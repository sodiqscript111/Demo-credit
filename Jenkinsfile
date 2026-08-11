pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    APP_NAME = 'demo-credit-api'
    NAMESPACE = 'demo-credit'

    AZURE_TENANT_ID = 'c69f3e39-8601-43c0-b0a6-115746c7f8c6'
    AZURE_RESOURCE_GROUP = 'demo-credit-dev-rg'
    AKS_CLUSTER_NAME = 'demo-credit-dev-aks'

    ACR_LOGIN_SERVER = 'democreditdev6ho4npacr.azurecr.io'
    ACR_NAME = 'democreditdev6ho4npacr'

    IMAGE_TAG = "${env.GIT_COMMIT}"
    IMAGE_NAME = "${ACR_LOGIN_SERVER}/${APP_NAME}:${IMAGE_TAG}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Typecheck') {
      steps {
        sh 'npx tsc --noEmit'
      }
    }

    stage('Test') {
      steps {
        sh 'npm test'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t ${IMAGE_NAME} .'
      }
    }

    stage('Azure Login') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'azure-service-principal',
            usernameVariable: 'AZURE_CLIENT_ID',
            passwordVariable: 'AZURE_CLIENT_SECRET'
          )
        ]) {
          sh '''
            az login --service-principal \
              --username "$AZURE_CLIENT_ID" \
              --password "$AZURE_CLIENT_SECRET" \
              --tenant "$AZURE_TENANT_ID"

            az acr login --name "$ACR_NAME"
          '''
        }
      }
    }

    stage('Push Docker Image') {
      steps {
        sh 'docker push ${IMAGE_NAME}'
      }
    }

    stage('Connect to AKS') {
      steps {
        sh '''
          az aks get-credentials \
            --resource-group "$AZURE_RESOURCE_GROUP" \
            --name "$AKS_CLUSTER_NAME" \
            --overwrite-existing
        '''
      }
    }

    stage('Apply Base Kubernetes Resources') {
      steps {
        sh '''
          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/configmap.yaml
          kubectl apply -f k8s/secret-provider-class.yaml
          kubectl apply -f k8s/mysql.yaml
          kubectl apply -f k8s/service.yaml
          kubectl apply -f k8s/ingress.yaml
          kubectl apply -f k8s/hpa.yaml
        '''
      }
    }

    stage('Wait for MySQL') {
      steps {
        sh '''
          kubectl wait --namespace "$NAMESPACE" \
            --for=condition=ready pod \
            -l app.kubernetes.io/component=mysql \
            --timeout=300s
        '''
      }
    }

    stage('Run Migrations') {
      steps {
        sh '''
          kubectl delete job demo-credit-migrations \
            -n "$NAMESPACE" \
            --ignore-not-found=true

          sed "s|democreditdev6ho4npacr.azurecr.io/demo-credit-api:latest|${IMAGE_NAME}|g" \
            k8s/migrations-job.yaml | kubectl apply -f -

          kubectl wait --namespace "$NAMESPACE" \
            --for=condition=complete \
            job/demo-credit-migrations \
            --timeout=300s
        '''
      }
    }

    stage('Deploy API') {
      steps {
        sh '''
          sed "s|democreditdev6ho4npacr.azurecr.io/demo-credit-api:latest|${IMAGE_NAME}|g" \
            k8s/deployment.yaml | kubectl apply -f -

          kubectl rollout status deployment/demo-credit-api \
            -n "$NAMESPACE" \
            --timeout=300s
        '''
      }
    }

    stage('Smoke Test') {
      steps {
        sh '''
          kubectl get pods -n "$NAMESPACE"
          kubectl get svc -n "$NAMESPACE"
          kubectl get ingress -n "$NAMESPACE"
        '''
      }
    }
  }

  post {
    always {
      sh 'docker image rm ${IMAGE_NAME} || true'
    }

    failure {
      sh '''
        echo "Deployment failed. Recent Kubernetes state:"
        kubectl get pods -n "$NAMESPACE" || true
        kubectl describe deployment demo-credit-api -n "$NAMESPACE" || true
      '''
    }
  }
}

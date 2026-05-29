pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    string(
      name: 'IMAGE_VERSION',
      defaultValue: '1.0.0',
      description: 'Version tag to publish together with latest.'
    )
    string(
      name: 'DOCKER_IMAGE',
      defaultValue: 'ghostwood/data-platform-portal',
      description: 'Docker image repository.'
    )
    string(
      name: 'KUBE_CONTEXT',
      defaultValue: '',
      description: 'Optional kubectl context to use for deployment.'
    )
  }

  environment {
    DOCKER_BUILDKIT = '0'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Validate') {
      steps {
        sh '''
          set -eu
          test -n "${IMAGE_VERSION}"
          test -n "${DOCKER_IMAGE}"
          docker version
          kubectl version --client=true
        '''
      }
    }

    stage('Build Image') {
      steps {
        sh '''
          set -eu
          docker build \
            -t "${DOCKER_IMAGE}:${IMAGE_VERSION}" \
            -t "${DOCKER_IMAGE}:latest" \
            .
        '''
      }
    }

    stage('Docker Login') {
        steps {
            withCredentials([
                usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKERHUB_USERNAME',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )
            ]) {
                sh '''
                    echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
                '''
            }
        }
    }

    stage('Push Image') {
      steps {
        sh '''
          set -eu
          docker push "${DOCKER_IMAGE}:${IMAGE_VERSION}"
          docker push "${DOCKER_IMAGE}:latest"
        '''
      }
    }

    stage('Deploy Kubernetes') {
      steps {
        sh '''
          set -eu
          if [ -n "${KUBE_CONTEXT}" ]; then
            kubectl config use-context "${KUBE_CONTEXT}"
          fi

          kubectl apply -k k8s
          kubectl -n portal rollout status deployment/portal-postgres --timeout=180s
          kubectl -n portal rollout status deployment/data-portal-app --timeout=300s
        '''
      }
    }
  }

  post {
    success {
      echo "Deployed ${DOCKER_IMAGE}:${IMAGE_VERSION} and ${DOCKER_IMAGE}:latest"
    }
  }
}

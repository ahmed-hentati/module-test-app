sonar:code-quality-scan:
  stage: Code-quality
  image: $CI_REGISTRY/$SONAR_SCANNER_IMAGE_TAG     # même image que le job partagé
  tags: ["ocp_l"]
  needs:
    - job: "lint"
      optional: true
  script:
    - echo "=== sonar-project.properties ==="
    - cat sonar-project.properties || echo "sonar-project.properties not found"
    - echo "=== Installing deps & running tests with coverage ==="
    - npm ci
    - npm run test-ci -- --coverage
    - echo "=== Coverage folder content ==="
    - ls -R coverage || echo "No coverage folder"
    - echo "=== Running SonarQube scanner ==="
    - sonar-scanner

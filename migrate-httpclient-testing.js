sonar:code-quality-scan:
  stage: Code-quality
  image: $CI_REGISTRY/node:24.3.0-yarn-v1
  tags: ["ocp_l"]
  needs:
    - job: "lint"
      optional: true
  script:
    - echo "=== Installing project dependencies ==="
    - npm ci

    - echo "=== Running tests with coverage ==="
    - npm run test-ci -- --coverage
    - ls -R coverage || echo "No coverage folder"

    - echo "=== Installing Sonar Scanner ==="
    - npm install -g sonar-scanner

    - echo "=== Running SonarQube scanner ==="
    - sonar-scanner

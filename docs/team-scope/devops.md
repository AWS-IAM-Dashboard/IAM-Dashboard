# DevOps Team Scope — IAM Dashboard (Spring 2026)

[REMOTE] Team Meetings: Tuesday 1:00-1:30

# Team Members List (3)
Ahanaf - DevOps Lead
Alvin - DevOps Member
Saleh - DevOps Member 

# OFFICIAL TASK LIST ROAD MAP

# Week 1 February 17 – February 23

    •	Complete scope and ownership document, onboarding all members with docker and git knowledge.
    •	Local environment setup
    •	Docker basics (containers, volumes, networks, etc.)
    •   Fix Docker Healthcheck
    •	Fix CI pipeline (Github Actions)
    •   Add Vite Service to Docker for FrontEnd
    •   Pin Prometheus/Grafana Image Versions

This week focuses on infra stability and onboarding process.

Ahanaf helped onboard and meet with members in regards to the DevOps IAM project, and pin prometheus/grafana image versions. Alvin fixed CI pipeline. Wakeen assisted in fixing docker healthcheck and adding vite service to docker for frontend. Saleh understood the team scope and successfully onboarded.

# Week 2 February 24 – March 2

Focus: CI/CD & Infra Automation

    •   Add Terraform apply workfrom on merge for infra deployment
    •   Ensure Docker services build cleanly in CI
    •   Improve Docker Image Layering (to optimize build times)
    •   Validate terraform workflow: (apply on merge to main, prevent manual drift)
    •   Add deployment health verification step.

This weeks goal is to have a completely automated & reliable infra pipleline along with better infra stability.

Ahanaf will implement the Terraform apply workflow on merge and strengthen CI configuration. Alvin will optimize Docker image layering and ensure services build cleanly in CI. Saleh will validate Terraform plan/apply behavior and confirm deployment health checks function correctly. The team will review pipeline stability and enforce drift prevention controls.

# Week 3 March 3 – March 9

Focus: Email + Local Dev Quality

    •	Add MailHog for local email testing:
        Welcome Email,
        Password Reset,
        Alert Emails
    •   Verify environment variable management (.env)
    •   Ensure local dev mirrors production setup.

This weeks goal is to improve developer experience.  

Ahanaf will integrate MailHog for local email testing and configure welcome, password reset, and alert email workflows. Alvin will validate environment variable management and standardize .env handling across services. Saleh will ensure the local development environment mirrors production configuration and verify service parity. The team will improve overall developer experience and onboarding reliability.

# Week 4 March 10 – March 16

Focus: Security Hardening

    •   Review secrets management (securing terraform variables, and no secrets in repo (important))
    •   Audit IAM permissions, following the least privilege principles.

This weeks goal is to have production-ready reliability and security.

Ahanaf will review and harden secrets management, ensuring Terraform variables and credentials are securely handled and no secrets are stored in the repository. Alvin will audit IAM roles and policies to enforce least-privilege access principles. Saleh will validate secure deployment configurations and confirm policy enforcement aligns with production standards. The team will strengthen production readiness through improved reliability and security controls.

# Week 5 March 17 – March 23

Focus: Data & Governance Support

    •	Support reports and audience backend integrations.
    •   Implement data retention policy infra
    •   Add logging + monitoring improvements
    •   Verify Prometheus/Grafana dashboards.

This weeks goal is to ensure governance compliance and observability.

Ahanaf will support backend report and audience integrations by ensuring infrastructure compatibility and deployment stability. Alvin will implement and validate data retention policies within the infrastructure layer. Saleh will enhance logging and monitoring configurations and verify Prometheus and Grafana dashboards for accuracy and completeness. The team will strengthen governance compliance and observability across the system.

# Week 6 March 24 - March 30

Focus: Production Preparation

    •	Infrastructure Stress Testing
    •   Monitoring Alert Tuning
    •   Finalize Documentation for CI/CD flow diagram and onboarding guide.
    •   Final deployment verification.

This weeks goal is to ensure stable, scaleable, and documented infrastructure.

Ahanaf will conduct infrastructure stress testing and validate system scalability under load. Alvin will tune monitoring alerts and optimize alert thresholds for production readiness. Saleh will finalize CI/CD documentation, including deployment flow diagrams and onboarding guides. The team will complete final deployment verification to ensure stable, scalable, and fully documented infrastructure.

# Week 7 March 31 - April 6

    Focus: Optimization and Security Hardening

    •	Optimize Docker images (reducing size & improve caching)
    •   Implement CI lint/format gates
    •   Verify deployment health endpoints.
    
    Ahanaf will optimize Docker images by reducing image size and improving layer caching strategies. Alvin will implement CI lint and formatting gates to enforce code quality standards across the pipeline. Saleh will verify deployment health endpoints and ensure post-deployment validation checks function correctly. The team will strengthen optimization, reliability, and security hardening across the infrastructure stack.





   




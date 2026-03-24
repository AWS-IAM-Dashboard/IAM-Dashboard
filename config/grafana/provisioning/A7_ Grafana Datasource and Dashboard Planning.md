**Documentation:** 

**A7-1: Datasource Configuration Review**

The Grafana datasource configuration was reviewed in:

config/grafana/provisioning/datasources/datasources.yml

### **Findings**

**Prometheus**

* URL: http://prometheus:9090

* Correctly configured as the **default datasource**

* Matches the Prometheus container running in the Docker environment

**PostgreSQL**

* Host: db:5432

* Database: cybersecurity\_db

* User: postgres

The configuration matches the PostgreSQL service defined in the Docker environment.

**Redis**

* Host: redis:6379

This datasource correctly points to the Redis container used for caching within the application.

**A7-2: Datasource Usage Plan**

**Prometheus**

Used for real-time system and infrastructure metrics including container performance, API request metrics, and scan activity metrics. Prometheus will power system health and operational dashboards.

**PostgreSQL**

Used for persistent application data including IAM scan results, policy violations, and historical findings. PostgreSQL will support dashboards focused on IAM insights and compliance reporting.

**Redis**

Primarily used as a caching layer for the application. Redis metrics may be used in the future for performance monitoring but are not required for the initial dashboard setup.

**A7-3: Grafana Dashboard Folder Plan**

**The Grafana dashboard structure will be organized into three primary folders:**

**Overview**  
This folder will contain high-level dashboards that summarize system health and security status. These dashboards will use both Prometheus and PostgreSQL as datasources. Prometheus will power infrastructure and application observability panels such as container health, request rates, and API latency. PostgreSQL will power security summary panels such as critical findings counts, compliance scores, and resources scanned.

**IAM**  
This folder will focus on Identity and Access Management insights. Dashboards will visualize IAM policies, role usage, MFA status, root access keys, and privilege escalation risks. These dashboards will primarily use PostgreSQL where IAM scan findings and entity data are stored. Redis may optionally be used as a caching layer for frequently polled IAM metrics.

**Compliance**

This folder will contain dashboards related to compliance monitoring and reporting. These dashboards will primarily use PostgreSQL for framework-specific findings, scores, and historical compliance trends. Prometheus will supplement these dashboards with observability metrics such as scan activity rates and API performance. Redis may optionally cache compliance aggregates to reduce database load.

**A7-4: Grafana Integration UI Alignment** 

The `GrafanaIntegration.tsx` component was reviewed to identify the mocked API endpoints and align them with the datasource strategy defined in A7-2 and A7-3.

**Endpoint to Datasource Mapping:**

| Endpoint | Primary Datasource | Optional |
| ----- | ----- | ----- |
| `/api/metrics/security/overview` | PostgreSQL | Redis (cache) |
| `/api/metrics/iam` | PostgreSQL | Redis (cache) |
| `/api/metrics/ec2` | PostgreSQL | Redis (cache) |
| `/api/metrics/s3` | PostgreSQL | Redis (cache) |
| `/api/metrics/compliance` | PostgreSQL | Redis (cache) |

All five endpoints return aggregated security and compliance state — findings, counts, and scores — which are business data records stored in PostgreSQL, not raw time-series data. The backend will query PostgreSQL to compute these aggregates, and Redis may optionally cache responses to reduce load when Grafana or the UI polls frequently.

**Prometheus** does not power these five endpoints. Instead, Prometheus handles infrastructure and application observability metrics such as container CPU/memory usage, API request rates, latency, and error rates. These Prometheus metrics will power the system health panels within the **Overview** folder in Grafana, complementing the PostgreSQL-backed security finding panels in the same folder.

The component will remain mock-backed for now, and no real backend connections are required at this stage.


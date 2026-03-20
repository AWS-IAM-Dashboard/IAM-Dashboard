/**
 * PDF Export Service
 * Generates PDF reports from scan results
 */

export interface ScanResultData {
  scan_id: string;
  scanner_type: string;
  region: string;
  status: string;
  timestamp: string;
  results?: any;
  findings?: any[];
  scan_summary?: {
    critical_findings?: number;
    high_findings?: number;
    medium_findings?: number;
    low_findings?: number;
    users?: number;
    roles?: number;
    policies?: number;
    groups?: number;
  };
}

/**
 * Generate a PDF from scan result data
 * Uses browser's print functionality as a simple solution
 * For production, consider using jspdf or react-pdf
 */
export function exportScanResultToPDF(data: ScanResultData, title: string = 'Security Scan Report'): void {
  // Create a temporary HTML element with the report content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please allow popups for this site.');
  }

  const htmlContent = generateReportHTML(data, title);
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Just open the window - user can manually print if they want
  // The window will display the report and user can use browser's print function (Ctrl/Cmd+P)
}

/**
 * Extract findings from various possible locations in the data
 */
function extractFindings(data: ScanResultData): any[] {
  // Try multiple locations where findings might be stored
  if (data.findings && data.findings.length > 0) {
    return data.findings;
  }
  
  // Check in results object
  if (data.results?.findings && Array.isArray(data.results.findings)) {
    return data.results.findings;
  }
  
  // For full scan, extract findings from IAM results
  if (data.results?.iam?.findings && Array.isArray(data.results.iam.findings)) {
    return data.results.iam.findings;
  }
  
  // Check for nested scan results (comprehensive reports)
  if (data.results?.scans && Array.isArray(data.results.scans)) {
    const allFindings: any[] = [];
    data.results.scans.forEach((scan: any) => {
      if (scan.findings && Array.isArray(scan.findings)) {
        allFindings.push(...scan.findings);
      }
      if (scan.results?.findings && Array.isArray(scan.results.findings)) {
        allFindings.push(...scan.results.findings);
      }
      // Check nested IAM findings
      if (scan.results?.iam?.findings && Array.isArray(scan.results.iam.findings)) {
        allFindings.push(...scan.results.iam.findings);
      }
    });
    return allFindings;
  }
  
  // Check for IAM-specific findings
  if (data.results?.iam_findings && Array.isArray(data.results.iam_findings)) {
    return data.results.iam_findings;
  }
  
  // Check for Security Hub findings
  if (data.results?.security_hub_findings && Array.isArray(data.results.security_hub_findings)) {
    return data.results.security_hub_findings;
  }
  
  // For IAM scans, check nested locations
  if (data.results?.users?.findings && Array.isArray(data.results.users.findings)) {
    return data.results.users.findings;
  }
  if (data.results?.roles?.findings && Array.isArray(data.results.roles.findings)) {
    return data.results.roles.findings;
  }
  
  return [];
}

/**
 * Extract scan summary from various possible locations in the data
 */
function extractScanSummary(data: ScanResultData): ScanResultData['scan_summary'] {
  // Direct scan_summary
  if (data.scan_summary) {
    return data.scan_summary;
  }
  
  // For full scan, extract from IAM results and combine with resource counts
  if (data.results?.iam) {
    const iamResults = data.results.iam;
    const summary: ScanResultData['scan_summary'] = {
      critical_findings: iamResults.scan_summary?.critical_findings || 0,
      high_findings: iamResults.scan_summary?.high_findings || 0,
      medium_findings: iamResults.scan_summary?.medium_findings || 0,
      low_findings: iamResults.scan_summary?.low_findings || 0,
      users: iamResults.users?.total || iamResults.scan_summary?.users || 0,
      roles: iamResults.roles?.total || iamResults.scan_summary?.roles || 0,
      policies: iamResults.policies?.total || iamResults.scan_summary?.policies || 0,
      groups: iamResults.groups?.total || iamResults.scan_summary?.groups || 0
    };
    return summary;
  }
  
  // Check in results.scan_summary
  if (data.results?.scan_summary) {
    return data.results.scan_summary;
  }
  
  // For IAM scans, extract resource counts from nested structure
  if (data.results?.users || data.results?.roles) {
    return {
      critical_findings: data.results.scan_summary?.critical_findings || 0,
      high_findings: data.results.scan_summary?.high_findings || 0,
      medium_findings: data.results.scan_summary?.medium_findings || 0,
      low_findings: data.results.scan_summary?.low_findings || 0,
      users: data.results.users?.total || 0,
      roles: data.results.roles?.total || 0,
      policies: data.results.policies?.total || 0,
      groups: data.results.groups?.total || 0
    };
  }
  
  // For comprehensive reports with nested scans
  if (data.results?.scans && Array.isArray(data.results.scans)) {
    // Aggregate from all scans
    const aggregated: ScanResultData['scan_summary'] = {
      critical_findings: 0,
      high_findings: 0,
      medium_findings: 0,
      low_findings: 0,
      users: 0,
      roles: 0,
      policies: 0,
      groups: 0
    };
    
    data.results.scans.forEach((scan: any) => {
      if (scan.scan_summary) {
        aggregated.critical_findings = (aggregated.critical_findings || 0) + (scan.scan_summary.critical_findings || 0);
        aggregated.high_findings = (aggregated.high_findings || 0) + (scan.scan_summary.high_findings || 0);
        aggregated.medium_findings = (aggregated.medium_findings || 0) + (scan.scan_summary.medium_findings || 0);
        aggregated.low_findings = (aggregated.low_findings || 0) + (scan.scan_summary.low_findings || 0);
        aggregated.users = (aggregated.users || 0) + (scan.scan_summary.users || 0);
        aggregated.roles = (aggregated.roles || 0) + (scan.scan_summary.roles || 0);
        aggregated.policies = (aggregated.policies || 0) + (scan.scan_summary.policies || 0);
        aggregated.groups = (aggregated.groups || 0) + (scan.scan_summary.groups || 0);
      }
      // Also check nested resource counts
      if (scan.results?.users?.total) aggregated.users = (aggregated.users || 0) + scan.results.users.total;
      if (scan.results?.roles?.total) aggregated.roles = (aggregated.roles || 0) + scan.results.roles.total;
      if (scan.results?.policies?.total) aggregated.policies = (aggregated.policies || 0) + scan.results.policies.total;
      if (scan.results?.groups?.total) aggregated.groups = (aggregated.groups || 0) + scan.results.groups.total;
    });
    
    return aggregated;
  }
  
  // Try to calculate from findings if available
  const findings = extractFindings(data);
  if (findings.length > 0) {
    return {
      critical_findings: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'critical').length,
      high_findings: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'high').length,
      medium_findings: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'medium').length,
      low_findings: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'low').length
    };
  }
  
  return {};
}

/**
 * Generate HTML content for the PDF report
 */
function generateReportHTML(data: ScanResultData, title: string): string {
  const date = new Date(data.timestamp).toLocaleString();
  const summary = extractScanSummary(data);
  const findings = extractFindings(data);
  const reportType = data.scanner_type || 'comprehensive';
  
  // Group findings by severity
  const findingsBySeverity = {
    Critical: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'critical'),
    High: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'high'),
    Medium: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'medium'),
    Low: findings.filter((f: any) => (f.severity || '').toLowerCase() === 'low'),
    Other: findings.filter((f: any) => {
      const sev = (f.severity || '').toLowerCase();
      return !['critical', 'high', 'medium', 'low'].includes(sev);
    })
  };

  // Generate template-specific content
  let executiveSection = '';
  let threatAnalysisSection = '';
  let complianceSection = '';

  // Executive Summary specific content
  if (reportType === 'executive-summary') {
    const totalFindings = (summary.critical_findings || 0) + (summary.high_findings || 0) + (summary.medium_findings || 0) + (summary.low_findings || 0);
    const compliancePercentage = (data.results as any)?.executive_metrics?.compliance_percentage || 
      (data.results as any)?.scan_summary?.compliance_score || 
      (totalFindings === 0 ? 100 : Math.max(0, Math.round(100 - ((summary.critical_findings || 0) * 10 + (summary.high_findings || 0) * 5) / (totalFindings || 1) * 100)));
    
    complianceSection = `
    <div class="section" style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0;">Compliance Overview</h2>
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 48px; font-weight: bold; color: ${compliancePercentage >= 80 ? '#00ff88' : compliancePercentage >= 60 ? '#ffb000' : '#ff0040'};">
          ${compliancePercentage}%
        </div>
        <p style="font-size: 18px; color: #666; margin-top: 10px;">Overall Compliance Score</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
        <div style="padding: 15px; background: white; border-radius: 5px;">
          <strong>Total Scans Analyzed:</strong> ${(data.results as any)?.scan_summary?.total_scans || 'N/A'}
        </div>
        <div style="padding: 15px; background: white; border-radius: 5px;">
          <strong>Total Findings:</strong> ${summary.total_findings || summary.critical_findings + summary.high_findings + summary.medium_findings + summary.low_findings || 0}
        </div>
      </div>
    </div>
    `;
  }

  // Threat Intelligence specific content
  if (reportType === 'threat-intelligence') {
    const threatAnalysis = (data.results as any)?.threat_analysis || {};
    const threatsByType = (data.results as any)?.threats_by_type || {};
    
    threatAnalysisSection = `
    <div class="section">
      <h2>Threat Analysis</h2>
      <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffb000; margin: 20px 0;">
        <p><strong>Total Threats Identified:</strong> ${threatAnalysis.total_threats || findings.length}</p>
        <p><strong>Critical Threats:</strong> ${threatAnalysis.critical_count || findingsBySeverity.Critical.length}</p>
        <p><strong>High Severity Threats:</strong> ${threatAnalysis.high_count || findingsBySeverity.High.length}</p>
        <p><strong>Threat Categories:</strong> ${threatAnalysis.threat_types?.length || Object.keys(threatsByType).length}</p>
      </div>
      
      ${Object.keys(threatsByType).length > 0 ? `
      <h3 style="margin-top: 30px;">Threats by Category</h3>
      ${Object.entries(threatsByType).map(([type, threats]: [string, any[]]) => `
        <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <h4 style="margin-top: 0; color: #0066cc;">${type} (${threats.length} threats)</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${threats.slice(0, 5).map((threat: any) => `
              <li style="margin: 5px 0;">
                <strong>${threat.resource_name || threat.resource_id || 'Unknown'}:</strong> 
                ${threat.description || threat.title || 'No description'}
              </li>
            `).join('')}
            ${threats.length > 5 ? `<li style="color: #666; font-style: italic;">... and ${threats.length - 5} more</li>` : ''}
          </ul>
        </div>
      `).join('')}
      ` : ''}
    </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0066cc;
      margin: 0;
    }
    .meta-info {
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #0066cc;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .summary-card {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
    }
    .summary-card h3 {
      margin: 0;
      font-size: 24px;
      color: #0066cc;
    }
    .summary-card p {
      margin: 5px 0 0 0;
      font-size: 12px;
      color: #666;
    }
    .critical { color: #ff0040; }
    .high { color: #ff6b35; }
    .medium { color: #ffb000; }
    .low { color: #00ff88; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 11px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { margin: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta-info">
      <p><strong>Scan ID:</strong> ${data.scan_id}</p>
      <p><strong>Scanner Type:</strong> ${data.scanner_type.toUpperCase()}</p>
      <p><strong>Region:</strong> ${data.region}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      <p><strong>Generated:</strong> ${date}</p>
    </div>
  </div>

  <div class="section">
    <h2>${reportType === 'executive-summary' ? 'Key Metrics' : 'Executive Summary'}</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3 class="critical">${summary.critical_findings || 0}</h3>
        <p>Critical Findings</p>
      </div>
      <div class="summary-card">
        <h3 class="high">${summary.high_findings || 0}</h3>
        <p>High Findings</p>
      </div>
      <div class="summary-card">
        <h3 class="medium">${summary.medium_findings || 0}</h3>
        <p>Medium Findings</p>
      </div>
      <div class="summary-card">
        <h3 class="low">${summary.low_findings || 0}</h3>
        <p>Low Findings</p>
      </div>
    </div>
  </div>

  ${complianceSection}

  ${threatAnalysisSection}

  ${data.scan_summary ? `
  <div class="section">
    <h2>Resource Summary</h2>
    <table>
      <tr>
        <th>Resource Type</th>
        <th>Count</th>
      </tr>
      ${summary.users ? `<tr><td>Users</td><td>${summary.users}</td></tr>` : ''}
      ${summary.roles ? `<tr><td>Roles</td><td>${summary.roles}</td></tr>` : ''}
      ${summary.policies ? `<tr><td>Policies</td><td>${summary.policies}</td></tr>` : ''}
      ${summary.groups ? `<tr><td>Groups</td><td>${summary.groups}</td></tr>` : ''}
    </table>
  </div>
  ` : ''}

  ${findings.length > 0 ? `
  <div class="section">
    <h2>${reportType === 'executive-summary' ? 'Top Critical Risks' : reportType === 'threat-intelligence' ? 'Threat Details' : 'Detailed Findings'} (${findings.length} total)</h2>
    ${findingsBySeverity.Critical.length > 0 ? `
    <div class="severity-section" style="margin: 20px 0;">
      <h3 style="color: #ff0040; margin-bottom: 10px;">Critical Findings (${findingsBySeverity.Critical.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Type</th>
            <th>Impact / Likelihood</th>
            <th>Risk Score</th>
            <th>Description</th>
            <th>Recommendation</th>
            <th>ARN</th>
          </tr>
        </thead>
        <tbody>
          ${findingsBySeverity.Critical.map((finding: any) => `
            <tr>
              <td><strong>${finding.resource_name || finding.resource_id || 'N/A'}</strong></td>
              <td>${finding.type || finding.finding_type || finding.resource_type || 'N/A'}</td>
              <td>${finding.impact && finding.likelihood ? `${finding.impact} / ${finding.likelihood}` : '—'}</td>
              <td>${finding.risk_score != null ? finding.risk_score : '—'}</td>
              <td>${finding.description || finding.title || 'No description available'}</td>
              <td>${finding.recommendation || finding.remediation || 'Review and remediate'}</td>
              <td style="font-size: 10px; word-break: break-all;">${finding.resource_arn || finding.arn || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    ${findingsBySeverity.High.length > 0 ? `
    <div class="severity-section" style="margin: 20px 0;">
      <h3 style="color: #ff6b35; margin-bottom: 10px;">High Findings (${findingsBySeverity.High.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Type</th>
            <th>Impact / Likelihood</th>
            <th>Risk Score</th>
            <th>Description</th>
            <th>Recommendation</th>
            <th>ARN</th>
          </tr>
        </thead>
        <tbody>
          ${findingsBySeverity.High.map((finding: any) => `
            <tr>
              <td><strong>${finding.resource_name || finding.resource_id || 'N/A'}</strong></td>
              <td>${finding.type || finding.finding_type || finding.resource_type || 'N/A'}</td>
              <td>${finding.impact && finding.likelihood ? `${finding.impact} / ${finding.likelihood}` : '—'}</td>
              <td>${finding.risk_score != null ? finding.risk_score : '—'}</td>
              <td>${finding.description || finding.title || 'No description available'}</td>
              <td>${finding.recommendation || finding.remediation || 'Review and remediate'}</td>
              <td style="font-size: 10px; word-break: break-all;">${finding.resource_arn || finding.arn || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    ${findingsBySeverity.Medium.length > 0 ? `
    <div class="severity-section" style="margin: 20px 0;">
      <h3 style="color: #ffb000; margin-bottom: 10px;">Medium Findings (${findingsBySeverity.Medium.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Type</th>
            <th>Impact / Likelihood</th>
            <th>Risk Score</th>
            <th>Description</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${findingsBySeverity.Medium.map((finding: any) => `
            <tr>
              <td><strong>${finding.resource_name || finding.resource_id || 'N/A'}</strong></td>
              <td>${finding.type || finding.finding_type || finding.resource_type || 'N/A'}</td>
              <td>${finding.impact && finding.likelihood ? `${finding.impact} / ${finding.likelihood}` : '—'}</td>
              <td>${finding.risk_score != null ? finding.risk_score : '—'}</td>
              <td>${finding.description || finding.title || 'No description available'}</td>
              <td>${finding.recommendation || finding.remediation || 'Review and remediate'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    ${findingsBySeverity.Low.length > 0 ? `
    <div class="severity-section" style="margin: 20px 0;">
      <h3 style="color: #00ff88; margin-bottom: 10px;">Low Findings (${findingsBySeverity.Low.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Type</th>
            <th>Impact / Likelihood</th>
            <th>Risk Score</th>
            <th>Description</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${findingsBySeverity.Low.map((finding: any) => `
            <tr>
              <td><strong>${finding.resource_name || finding.resource_id || 'N/A'}</strong></td>
              <td>${finding.type || finding.finding_type || finding.resource_type || 'N/A'}</td>
              <td>${finding.impact && finding.likelihood ? `${finding.impact} / ${finding.likelihood}` : '—'}</td>
              <td>${finding.risk_score != null ? finding.risk_score : '—'}</td>
              <td>${finding.description || finding.title || 'No description available'}</td>
              <td>${finding.recommendation || finding.remediation || 'Review and remediate'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
  </div>
  ` : `
  <div class="section">
    <h2>Detailed Findings</h2>
    <p style="color: #666; font-style: italic;">No detailed findings available. The scan may not have returned individual findings, or findings may be nested in the results data.</p>
    <p style="color: #666; font-size: 12px; margin-top: 10px;">Check the "Scan Details" section below for raw scan data.</p>
  </div>
  `}

  ${findings.length === 0 && data.results ? `
  <div class="section">
    <h2>Scan Details</h2>
    <p style="color: #666; margin-bottom: 10px;">Raw scan results (findings may be nested in this data):</p>
    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 10px; max-height: 400px; overflow-y: auto;">
${JSON.stringify(data.results || {}, null, 2)}
    </pre>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by IAM Dashboard Security Scanner</p>
    <p>This report was automatically generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Download scan result as JSON file
 */
export function exportScanResultToJSON(data: ScanResultData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `scan-${data.scan_id}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download scan result as CSV file.
 * Includes severity, impact, likelihood, and risk_score when present (IAM scoring model).
 */
export function exportScanResultToCSV(data: ScanResultData, filename?: string): void {
  const findings = extractFindings(data);
  if (!findings || findings.length === 0) {
    throw new Error('No findings to export');
  }

  const headers = ['Severity', 'Impact', 'Likelihood', 'Risk Score', 'Type', 'Resource Name', 'Resource ARN', 'Description', 'Recommendation'];
  const rows = findings.map((finding: any) => [
    finding.severity || '',
    finding.impact || '',
    finding.likelihood || '',
    finding.risk_score != null ? String(finding.risk_score) : '',
    finding.type || finding.finding_type || '',
    finding.resource_name || '',
    finding.resource_arn || '',
    (finding.description || '').replace(/,/g, ';'),
    (finding.recommendation || '').replace(/,/g, ';')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `scan-${data.scan_id}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



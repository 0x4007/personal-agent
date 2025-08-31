export interface MetricConfig {
  name: string;
  type: 'counter' | 'histogram' | 'gauge';
  labels: string[];
  buckets?: number[];
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  notification: string[];
}

export const MONITORING_CONFIG = {
  metrics: [
    {
      name: 'request_count',
      type: 'counter',
      labels: ['platform', 'status', 'method']
    },
    {
      name: 'response_time',
      type: 'histogram',
      labels: ['platform', 'operation', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    },
    {
      name: 'error_rate',
      type: 'gauge',
      labels: ['platform', 'error_type', 'severity']
    },
    {
      name: 'active_sessions',
      type: 'gauge',
      labels: ['platform', 'user']
    },
    {
      name: 'claude_api_calls',
      type: 'counter',
      labels: ['status', 'model', 'retry_count']
    },
    {
      name: 'mcp_tool_usage',
      type: 'counter',
      labels: ['tool', 'platform', 'success']
    },
    {
      name: 'github_actions_duration',
      type: 'histogram',
      labels: ['workflow', 'job', 'status'],
      buckets: [10, 30, 60, 120, 300, 600]
    },
    {
      name: 'webhook_processing_time',
      type: 'histogram',
      labels: ['platform', 'event_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
    }
  ] as MetricConfig[],
  
  alerts: [
    {
      name: 'HighErrorRate',
      condition: 'rate(error_rate[5m]) > 0.05',
      severity: 'critical',
      notification: ['pagerduty', 'slack']
    },
    {
      name: 'SlowResponse',
      condition: 'histogram_quantile(0.95, response_time[5m]) > 5',
      severity: 'warning',
      notification: ['slack']
    },
    {
      name: 'ClaudeAPIDown',
      condition: 'rate(claude_api_calls{status="error"}[5m]) > 0.9',
      severity: 'critical',
      notification: ['pagerduty', 'email']
    },
    {
      name: 'HighMemoryUsage',
      condition: 'memory_usage > 0.9',
      severity: 'warning',
      notification: ['slack']
    },
    {
      name: 'RateLimitApproaching',
      condition: 'rate_limit_remaining < 100',
      severity: 'info',
      notification: ['slack']
    },
    {
      name: 'LongRunningAction',
      condition: 'github_actions_duration > 600',
      severity: 'warning',
      notification: ['slack']
    },
    {
      name: 'AuthenticationFailures',
      condition: 'rate(request_count{status="401"}[5m]) > 10',
      severity: 'critical',
      notification: ['pagerduty', 'security-team']
    }
  ] as AlertConfig[],
  
  dashboards: {
    main: {
      name: 'Personal Agent Overview',
      panels: [
        {
          title: 'Request Rate',
          type: 'graph',
          query: 'rate(request_count[5m])'
        },
        {
          title: 'Error Rate',
          type: 'graph',
          query: 'rate(error_rate[5m])'
        },
        {
          title: 'Response Time (p95)',
          type: 'graph',
          query: 'histogram_quantile(0.95, response_time[5m])'
        },
        {
          title: 'Active Sessions',
          type: 'stat',
          query: 'active_sessions'
        }
      ]
    },
    
    platforms: {
      name: 'Platform Performance',
      panels: [
        {
          title: 'Requests by Platform',
          type: 'pie',
          query: 'sum by(platform) (request_count)'
        },
        {
          title: 'Platform Response Times',
          type: 'graph',
          query: 'histogram_quantile(0.95, response_time[5m]) by (platform)'
        },
        {
          title: 'MCP Tool Usage',
          type: 'table',
          query: 'sum by(tool) (mcp_tool_usage)'
        }
      ]
    },
    
    claude: {
      name: 'Claude Integration',
      panels: [
        {
          title: 'API Call Rate',
          type: 'graph',
          query: 'rate(claude_api_calls[5m])'
        },
        {
          title: 'API Success Rate',
          type: 'gauge',
          query: 'rate(claude_api_calls{status="success"}[5m]) / rate(claude_api_calls[5m])'
        },
        {
          title: 'Retry Distribution',
          type: 'heatmap',
          query: 'claude_api_calls by (retry_count)'
        }
      ]
    }
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    fields: [
      'timestamp',
      'level',
      'message',
      'platform',
      'correlation_id',
      'user',
      'duration',
      'error'
    ],
    retention: {
      debug: '1d',
      info: '7d',
      warn: '30d',
      error: '90d'
    }
  },
  
  tracing: {
    enabled: true,
    sampleRate: 0.1,
    endpoints: [
      '/github',
      '/telegram',
      '/discord',
      '/slack'
    ]
  }
};

// Prometheus metrics exporter
export function getMetricsEndpoint(): string {
  const metrics = MONITORING_CONFIG.metrics.map(metric => {
    const helpText = `# HELP ${metric.name} ${metric.name} metric`;
    const typeText = `# TYPE ${metric.name} ${metric.type}`;
    return `${helpText}\n${typeText}`;
  }).join('\n\n');
  
  return metrics;
}

// Datadog configuration
export const DATADOG_CONFIG = {
  apiKey: process.env.DATADOG_API_KEY,
  site: 'datadoghq.com',
  service: 'personal-agent',
  env: process.env.NODE_ENV || 'development',
  version: process.env.GITHUB_SHA || 'unknown',
  tags: [
    `agent:${process.env.AGENT_OWNER}`,
    `deployment:${process.env.DEPLOYMENT_TYPE || 'github-actions'}`
  ]
};

// Sentry configuration
export const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.GITHUB_SHA,
  tracesSampleRate: 0.1,
  beforeSend: (event: any) => {
    // Scrub sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['x-api-key'];
    }
    return event;
  }
};
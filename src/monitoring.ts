export interface SystemMetrics {
  timestamp: Date;
  platform: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata: {
    userId?: string;
    eventType?: string;
    toolsUsed?: string[];
    retries?: number;
    fallbackUsed?: boolean;
  };
}

export interface AlertThresholds {
  maxResponseTime: number;
  minSuccessRate: number;
  maxErrorRate: number;
  maxRetries: number;
}

export class MetricsCollector {
  private metrics: SystemMetrics[] = [];
  private alertThresholds: AlertThresholds = {
    maxResponseTime: 10000, // 10 seconds
    minSuccessRate: 95,     // 95%
    maxErrorRate: 5,        // 5%
    maxRetries: 3
  };
  
  record(metric: SystemMetrics): void {
    this.metrics.push(metric);
    this.sendToMonitoring(metric);
    
    // Check for alerts
    if (!metric.success) {
      this.checkAlerts(metric);
    }
  }
  
  private sendToMonitoring(metric: SystemMetrics): void {
    // In production, send to monitoring service (Datadog, CloudWatch, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: this.sendToDatadog(metric);
      console.log('[METRICS]', JSON.stringify({
        ...metric,
        timestamp: metric.timestamp.toISOString()
      }));
    }
  }
  
  private checkAlerts(metric: SystemMetrics): void {
    if (this.isCritical(metric)) {
      this.triggerAlert('critical', metric);
    } else if (this.isWarning(metric)) {
      this.triggerAlert('warning', metric);
    }
  }
  
  private isCritical(metric: SystemMetrics): boolean {
    return (
      metric.duration > this.alertThresholds.maxResponseTime * 2 ||
      metric.metadata.retries === this.alertThresholds.maxRetries ||
      metric.error?.includes('UNAUTHORIZED') ||
      metric.error?.includes('FORBIDDEN')
    );
  }
  
  private isWarning(metric: SystemMetrics): boolean {
    return (
      metric.duration > this.alertThresholds.maxResponseTime ||
      (metric.metadata.retries || 0) > 1 ||
      metric.metadata.fallbackUsed === true
    );
  }
  
  private triggerAlert(level: 'critical' | 'warning', metric: SystemMetrics): void {
    const alert = {
      level,
      timestamp: new Date(),
      platform: metric.platform,
      operation: metric.operation,
      error: metric.error,
      duration: metric.duration,
      metadata: metric.metadata
    };
    
    // In production, send to alerting service
    console.error(`[ALERT:${level.toUpperCase()}]`, JSON.stringify(alert));
    
    // Could also send to Slack, PagerDuty, etc.
    if (level === 'critical' && process.env.NODE_ENV === 'production') {
      // this.notifyOncall(alert);
    }
  }
  
  getStats(platform?: string, timeWindow?: number): any {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    let filtered = this.metrics.filter(m => 
      m.timestamp.getTime() >= windowStart
    );
    
    if (platform) {
      filtered = filtered.filter(m => m.platform === platform);
    }
    
    if (filtered.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        avgDuration: 0,
        successRate: 100,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0
      };
    }
    
    const successful = filtered.filter(m => m.success);
    const failed = filtered.filter(m => !m.success);
    const durations = filtered.map(m => m.duration).sort((a, b) => a - b);
    
    return {
      total: filtered.length,
      success: successful.length,
      failed: failed.length,
      avgDuration: this.average(durations),
      successRate: (successful.length / filtered.length) * 100,
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      errorTypes: this.groupErrors(failed),
      platformBreakdown: this.groupByPlatform(filtered),
      operationBreakdown: this.groupByOperation(filtered)
    };
  }
  
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  private groupErrors(failed: SystemMetrics[]): Record<string, number> {
    const errors: Record<string, number> = {};
    failed.forEach(m => {
      const errorType = m.error || 'Unknown';
      errors[errorType] = (errors[errorType] || 0) + 1;
    });
    return errors;
  }
  
  private groupByPlatform(metrics: SystemMetrics[]): Record<string, number> {
    const platforms: Record<string, number> = {};
    metrics.forEach(m => {
      platforms[m.platform] = (platforms[m.platform] || 0) + 1;
    });
    return platforms;
  }
  
  private groupByOperation(metrics: SystemMetrics[]): Record<string, number> {
    const operations: Record<string, number> = {};
    metrics.forEach(m => {
      operations[m.operation] = (operations[m.operation] || 0) + 1;
    });
    return operations;
  }
  
  // Health check endpoint data
  getHealthStatus(): any {
    const recentWindow = 60000; // Last minute
    const recentStats = this.getStats(undefined, recentWindow);
    
    const isHealthy = 
      recentStats.successRate >= this.alertThresholds.minSuccessRate &&
      recentStats.p95Duration <= this.alertThresholds.maxResponseTime;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: {
        successRate: recentStats.successRate,
        avgResponseTime: recentStats.avgDuration,
        p95ResponseTime: recentStats.p95Duration,
        totalRequests: recentStats.total,
        failedRequests: recentStats.failed
      },
      platforms: recentStats.platformBreakdown,
      thresholds: this.alertThresholds
    };
  }
  
  // Export metrics for external monitoring
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.toPrometheusFormat();
    }
    return JSON.stringify(this.metrics);
  }
  
  private toPrometheusFormat(): string {
    const stats = this.getStats();
    const lines: string[] = [
      '# HELP agent_requests_total Total number of agent requests',
      '# TYPE agent_requests_total counter',
      `agent_requests_total ${stats.total}`,
      '',
      '# HELP agent_requests_success_total Total number of successful requests',
      '# TYPE agent_requests_success_total counter',
      `agent_requests_success_total ${stats.success}`,
      '',
      '# HELP agent_requests_failed_total Total number of failed requests',
      '# TYPE agent_requests_failed_total counter',
      `agent_requests_failed_total ${stats.failed}`,
      '',
      '# HELP agent_request_duration_seconds Request duration in seconds',
      '# TYPE agent_request_duration_seconds summary',
      `agent_request_duration_seconds{quantile="0.5"} ${stats.p50Duration / 1000}`,
      `agent_request_duration_seconds{quantile="0.95"} ${stats.p95Duration / 1000}`,
      `agent_request_duration_seconds{quantile="0.99"} ${stats.p99Duration / 1000}`,
      `agent_request_duration_seconds_sum ${(stats.avgDuration * stats.total) / 1000}`,
      `agent_request_duration_seconds_count ${stats.total}`,
    ];
    
    // Add platform-specific metrics
    Object.entries(stats.platformBreakdown).forEach(([platform, count]) => {
      lines.push(`agent_requests_by_platform{platform="${platform}"} ${count}`);
    });
    
    return lines.join('\n');
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Helper function to track operations
export async function trackOperation<T>(
  platform: string,
  operation: string,
  metadata: any,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  
  try {
    const result = await fn();
    success = true;
    return result;
  } catch (err: any) {
    error = err.message || String(err);
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    
    metricsCollector.record({
      timestamp: new Date(),
      platform,
      operation,
      duration,
      success,
      error,
      metadata
    });
  }
}
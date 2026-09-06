import crypto from 'node:crypto';
import prisma from '../config/prisma';
import { PaymentEngineService } from './payment-engine.service';
import { logger } from '../utils/logger';

type CheckStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
type Severity = 'INFO' | 'WARNING' | 'MAJOR' | 'CRITICAL';
type CheckInput = {
  service: string;
  status: CheckStatus;
  severity: Severity;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

const unhealthyStatuses = new Set<CheckStatus>(['DEGRADED', 'OFFLINE']);
const severityFor = (status: CheckStatus, customerImpact = false): Severity => {
  if (status === 'OFFLINE') return customerImpact ? 'CRITICAL' : 'MAJOR';
  if (status === 'DEGRADED') return 'WARNING';
  return 'INFO';
};
const paymentEngineService = new PaymentEngineService();

class MonitoringService {
  private async recordCheck(input: CheckInput) {
    const previous = await prisma.monitoringCheck.findMany({
      where: { service: input.service },
      orderBy: { checkedAt: 'desc' },
      take: 3,
    });
    let consecutiveFailures = 0;
    if (unhealthyStatuses.has(input.status)) {
      for (const check of previous) {
        if (!unhealthyStatuses.has(check.status as CheckStatus)) break;
        consecutiveFailures += 1;
      }
      consecutiveFailures += 1;
    }
    const active = await prisma.monitoringIncident.findFirst({
      where: { service: input.service, status: { in: ['WARNING', 'MAJOR', 'CRITICAL'] } },
      orderBy: { startedAt: 'desc' },
    });
    let incidentId = active?.id;

    if (unhealthyStatuses.has(input.status) && consecutiveFailures >= 3 && !active) {
      const incident = await prisma.monitoringIncident.create({
        data: {
          id: crypto.randomUUID(),
          service: input.service,
          severity: input.severity,
          status: input.severity,
          startedAt: new Date(),
          lastFailureAt: new Date(),
          failureCount: consecutiveFailures,
          errorMessage: input.errorMessage,
          detectionSource: 'extended-monitoring',
        },
      });
      incidentId = incident.id;
      logger.warn(`[MONITORING] incident opened service=${input.service} severity=${input.severity}`);
    } else if (active && unhealthyStatuses.has(input.status)) {
      await prisma.monitoringIncident.update({
        where: { id: active.id },
        data: {
          lastFailureAt: new Date(),
          failureCount: { increment: 1 },
          severity: input.severity,
          status: input.severity,
          errorMessage: input.errorMessage,
        },
      });
    } else if (active && input.status === 'ONLINE') {
      // An incident is recovered by the first confirmed healthy check after
      // the failure. Requiring a healthy predecessor could leave incidents
      // open forever after an outage/recovery transition.
      await prisma.monitoringIncident.update({
        where: { id: active.id },
        data: { status: 'RECOVERED', resolvedAt: new Date(), recoverySentAt: new Date() },
      });
      logger.info(`[MONITORING] incident recovered service=${input.service}`);
      incidentId = active.id;
    }

    await prisma.monitoringCheck.create({
      data: {
        service: input.service,
        status: input.status,
        severity: input.severity,
        responseTimeMs: input.responseTimeMs,
        errorMessage: input.errorMessage,
        metadata: input.metadata as any,
        incidentId,
      },
    });
    return { ...input, incidentId, consecutiveFailures };
  }

  private providerCheck(
    service: string,
    item: any,
    customerImpact = false,
  ): CheckInput {
    if (!item || item.status === 'OFFLINE') {
      return { service, status: 'OFFLINE', severity: severityFor('OFFLINE', customerImpact), errorMessage: item?.message || 'No health information available' };
    }
    const configured = item.configured === true || item.status === 'ONLINE';
    if (configured) {
      return {
        service,
        status: 'ONLINE',
        severity: 'INFO',
        metadata: { configurationOnly: true, configSummary: item.configSummary || null },
      };
    }
    if (item.configSummary) {
      return {
        service,
        status: 'OFFLINE',
        severity: 'WARNING',
        errorMessage: 'Required configuration is missing',
        metadata: { configurationOnly: true, configSummary: item.configSummary },
      };
    }
    return { service, status: 'UNKNOWN', severity: 'WARNING', errorMessage: item.message || 'Health state unknown' };
  }

  async runChecks(source = 'extended-monitoring') {
    const started = Date.now();
    const health = await paymentEngineService.checkSystemHealth();
    const checks: CheckInput[] = [
      { service: 'backend-api', status: 'ONLINE', severity: 'INFO', responseTimeMs: Date.now() - started },
      {
        service: 'postgresql',
        status: health.services.database?.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
        severity: health.services.database?.status === 'ONLINE' ? 'INFO' : 'CRITICAL',
        responseTimeMs: Number.parseInt(health.services.database?.responseTime || '', 10) || undefined,
        errorMessage: health.services.database?.message,
      },
      this.providerCheck('pesapal', health.services.pesapalApi, true),
      this.providerCheck('tuma', health.services.tumaApi, true),
      this.providerCheck('talksasa', health.services.talksasaSms),
      this.providerCheck('email', health.services.emailService),
      this.providerCheck('payment-callback', health.services.callbackEndpoint, true),
      { service: 'socket-io', status: 'UNKNOWN', severity: 'WARNING', errorMessage: 'Realtime transport has no safe active probe; verify from connected clients' },
      { service: 'authentication', status: 'ONLINE', severity: 'INFO', metadata: { databaseDependency: true } },
    ];

    try {
      const [unbilledReadings, pendingNotifications, failedNotifications] = await Promise.all([
        prisma.meterReading.count({ where: { billId: null } }),
        prisma.userNotification.count({ where: { status: 'PENDING' } }),
        prisma.userNotification.count({ where: { status: 'FAILED' } }),
      ]);
      checks.push({
        service: 'billing',
        status: unbilledReadings > 50 ? 'DEGRADED' : 'ONLINE',
        severity: unbilledReadings > 50 ? 'WARNING' : 'INFO',
        metadata: { unbilledReadings },
        errorMessage: unbilledReadings > 50 ? 'Unbilled meter-reading backlog is elevated' : undefined,
      });
      checks.push({
        service: 'notifications',
        status: failedNotifications > 0 ? 'DEGRADED' : 'ONLINE',
        severity: failedNotifications > 0 ? 'WARNING' : 'INFO',
        metadata: { pendingNotifications, failedNotifications },
        errorMessage: failedNotifications > 0 ? 'Notification delivery failures recorded' : undefined,
      });
    } catch (error) {
      checks.push({ service: 'billing', status: 'UNKNOWN', severity: 'WARNING', errorMessage: 'Business monitoring query failed' });
      checks.push({ service: 'notifications', status: 'UNKNOWN', severity: 'WARNING', errorMessage: 'Notification monitoring query failed' });
    }

    const recorded = [];
    for (const check of checks) recorded.push(await this.recordCheck(check));
    recorded.push(await this.recordCheck({
      service: 'database-backup-dr',
      status: 'DEGRADED',
      severity: 'WARNING',
      errorMessage: 'Neon protection is limited: 6-hour history, no automatic snapshot schedule',
      metadata: {
        provider: 'Neon', plan: 'free_v3', productionBranch: 'production', historyRetentionHours: 6,
        automaticSnapshots: false, latestKnownManualSnapshot: '2026-09-03T18:55:54Z',
        restoreVerification: 'PASSED', restoreTestMethod: 'temporary branch from manual snapshot',
        productionModified: false, rpoTarget: '<=24 hours', rtoTarget: '<=4 hours', targetsValidated: false,
      },
    }));
    return this.getStatusSnapshot(recorded, source);
  }

  async getStatusSnapshot(latestChecks?: any[], source = 'admin-system-check') {
    const checks = await prisma.monitoringCheck.findMany({ where: { checkedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, orderBy: { checkedAt: 'desc' }, take: 500 });
    const latestByService = new Map<string, any>();
    for (const check of checks) if (!latestByService.has(check.service)) latestByService.set(check.service, check);
    const activeIncidents = await prisma.monitoringIncident.findMany({ where: { status: { in: ['WARNING', 'MAJOR', 'CRITICAL'] } }, orderBy: { startedAt: 'desc' }, take: 50 });
    const incidents = await prisma.monitoringIncident.findMany({ orderBy: { startedAt: 'desc' }, take: 200 });
    const detailsByService = new Map<string, any[]>();
    for (const check of checks) {
      const history = detailsByService.get(check.service) || [];
      history.push(check);
      detailsByService.set(check.service, history);
    }
    for (const [service, history] of detailsByService) {
      const latest = history[0];
      const lastSuccess = history.find((check) => check.status === 'ONLINE');
      const lastFailure = history.find((check) => check.status !== 'ONLINE');
      let consecutiveFailures = 0;
      for (const check of history) {
        if (check.status === 'ONLINE') break;
        consecutiveFailures += 1;
      }
      const latencies = history.map((check) => check.responseTimeMs).filter((value): value is number => Number.isFinite(value)).sort((a, b) => a - b);
      const percentile = (ratio: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * ratio))] : null;
      const serviceIncidents = incidents.filter((incident) => incident.service === service);
      latest.details = {
        healthCheck: latest.metadata?.configurationOnly ? 'Configuration check' : 'Operational health check',
        lastSuccessfulAt: lastSuccess?.checkedAt || null,
        lastFailedAt: lastFailure?.checkedAt || null,
        consecutiveFailures,
        recentChecks: history.slice(0, 10),
        incidents: serviceIncidents,
        currentIncident: serviceIncidents.find((incident) => ['WARNING', 'MAJOR', 'CRITICAL'].includes(incident.status)) || null,
        latency: { averageMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99) },
      };
    }
    const online = [...latestByService.values()].filter((check) => check.status === 'ONLINE').length;
    const degraded = [...latestByService.values()].filter((check) => check.status === 'DEGRADED' || check.status === 'WARNING').length;
    const offline = [...latestByService.values()].filter((check) => check.status === 'OFFLINE').length;
    const responseTimes = checks.map((check: any) => check.responseTimeMs).filter((value: number | null | undefined): value is number => Number.isFinite(value)).sort((a: number, b: number) => a - b);
    const percentile = (ratio: number) => responseTimes.length ? responseTimes[Math.min(responseTimes.length - 1, Math.floor(responseTimes.length * ratio))] : null;
    return {
      status: offline > 0 ? 'CRITICAL' : degraded > 0 || activeIncidents.length > 0 ? 'WARNING' : 'ONLINE',
      checkedAt: new Date().toISOString(),
      source,
      summary: { servicesOnline: online, servicesDegraded: degraded, servicesOffline: offline, activeIncidents: activeIncidents.length, uptime24h: offline > 0 ? null : 100 },
      services: [...latestByService.values()],
      incidents: activeIncidents,
      performance: { samples24h: responseTimes.length, averageMs: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : null, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99) },
    };
  }
}

export const monitoringService = new MonitoringService();

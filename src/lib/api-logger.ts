/* eslint-disable no-console */
import { db } from './db';
import { ApiCallLog } from './types';

// 记录API调用
export async function logApiCall(
  source: string,
  sourceName: string,
  success: boolean,
  error?: string,
  responseTime?: number
): Promise<void> {
  try {
    const log: ApiCallLog = {
      timestamp: Date.now(),
      source,
      sourceName,
      success,
      error,
      responseTime
    };
    
    await db.addApiCallLog(log);
  } catch (err) {
    console.error('记录API调用失败:', err);
  }
}

// 获取API调用统计
export async function getApiCallStats(limit = 100): Promise<{
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgResponseTime: number;
  bySource: Record<string, { total: number; success: number; successRate: number }>;
}> {
  try {
    const logs = await db.getApiCallLogs(limit);
    
    const total = logs.length;
    const success = logs.filter(l => l.success).length;
    const failed = total - success;
    const successRate = total > 0 ? (success / total) * 100 : 0;
    
    // 计算平均响应时间（仅成功的请求）
    const responseTimes = logs
      .filter(l => l.success && l.responseTime !== undefined)
      .map(l => l.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    // 按源分组统计
    const bySource: Record<string, { total: number; success: number; successRate: number }> = {};
    logs.forEach(log => {
      if (!bySource[log.source]) {
        bySource[log.source] = { total: 0, success: 0, successRate: 0 };
      }
      bySource[log.source].total++;
      if (log.success) {
        bySource[log.source].success++;
      }
    });
    
    // 计算每个源的成功率
    Object.keys(bySource).forEach(source => {
      const stats = bySource[source];
      stats.successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
    });
    
    return {
      total,
      success,
      failed,
      successRate,
      avgResponseTime,
      bySource
    };
  } catch (err) {
    console.error('获取API调用统计失败:', err);
    return {
      total: 0,
      success: 0,
      failed: 0,
      successRate: 0,
      avgResponseTime: 0,
      bySource: {}
    };
  }
}

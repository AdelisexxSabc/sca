/* eslint-disable no-console */
import { db } from './db';
import { UserSession } from './types';

// 生成会话ID
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// 从请求头获取客户端信息
export function getClientInfo(headers: Headers): { 
  ipAddress?: string; 
  userAgent?: string 
} {
  // 获取IP地址（考虑代理）
  const ipAddress = 
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    undefined;
  
  const userAgent = headers.get('user-agent') || undefined;
  
  return { ipAddress, userAgent };
}

// 更新或创建用户会话
export async function updateUserSession(
  username: string,
  sessionId: string,
  headers: Headers
): Promise<void> {
  try {
    const { ipAddress, userAgent } = getClientInfo(headers);
    
    const session: UserSession = {
      username,
      sessionId,
      lastActiveAt: Date.now(),
      ipAddress,
      userAgent
    };
    
    await db.setUserSession(session);
    
    // 同时更新用户元数据的最后活跃时间
    const meta = await db.getUserMeta(username);
    if (meta) {
      await db.setUserMeta(username, {
        ...meta,
        lastActiveAt: Date.now()
      });
    }
  } catch (err) {
    console.error('更新用户会话失败:', err);
  }
}

// 获取在线用户数
export async function getOnlineUsersCount(timeoutMinutes = 30): Promise<number> {
  try {
    const sessions = await db.getAllActiveSessions(timeoutMinutes);
    // 去重，因为一个用户可能有多个会话
    const uniqueUsers = new Set(sessions.map((s: UserSession) => s.username));
    return uniqueUsers.size;
  } catch (err) {
    console.error('获取在线用户数失败:', err);
    return 0;
  }
}

// 获取在线用户列表
export async function getOnlineUsers(timeoutMinutes = 30): Promise<string[]> {
  try {
    const sessions = await db.getAllActiveSessions(timeoutMinutes);
    const uniqueUsers = new Set<string>(sessions.map((s: UserSession) => s.username));
    return Array.from(uniqueUsers);
  } catch (err) {
    console.error('获取在线用户列表失败:', err);
    return [];
  }
}

'use client';

import { useEffect, useRef } from 'react';

// 心跳间隔（毫秒）
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5分钟

export function UserHeartbeat() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 发送心跳
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        // 忽略错误
      }
    };

    // 立即发送一次
    sendHeartbeat();

    // 定期发送心跳
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // 不渲染任何内容
}

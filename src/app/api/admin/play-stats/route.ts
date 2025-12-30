/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { PlayRecord, PlayStatsResult } from '@/lib/types';

// 导出类型供页面组件使用
export type { PlayStatsResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储进行播放统计查看',
      },
      { status: 400 }
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    const storage = db;
    const username = authInfo.username;

    // 判定操作者角色
    let _operatorRole: 'owner' | 'admin';
    if (username === process.env.USERNAME) {
      _operatorRole = 'owner';
    } else {
      const userEntry = config.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
      _operatorRole = 'admin';
    }

    // 从config获取用户列表
    const allUsers = config.UserConfig.Users;
    const userStats: Array<{
      username: string;
      totalWatchTime: number;
      totalPlays: number;
      lastPlayTime: number;
      recentRecords: PlayRecord[];
      avgWatchTime: number;
      mostWatchedSource: string;
      registrationDays: number;
      lastLoginTime: number;
      loginCount: number;
      createdAt: number;
    }> = [];
    let totalWatchTime = 0;
    let totalPlays = 0;
    const sourceCount: Record<string, number> = {};
    const dailyData: Record<string, { watchTime: number; plays: number }> = {};

    // 用户注册统计
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let todayNewUsers = 0;
    let totalRegisteredUsers = 0;
    const registrationData: Record<string, number> = {};

    // 计算近7天的日期范围
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 设置项目开始时间
    const PROJECT_START_DATE = new Date('2025-09-14').getTime();

    // 为每个用户获取播放记录统计
    for (const user of allUsers) {
      // 从 UserMeta 获取用户创建时间（放在 try 外面以便 catch 也能使用）
      let userMeta = null;
      try {
        userMeta = await storage.getUserMeta(user.username);
      } catch {
        // 忽略 meta 获取错误
      }
      const userCreatedAt = userMeta?.createdAt || PROJECT_START_DATE;
      
      try {
        totalRegisteredUsers++;

        // 使用自然日计算注册天数
        const firstDate = new Date(userCreatedAt);
        const currentDate = new Date();
        const firstDay = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
        const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const registrationDays = Math.floor((currentDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // 统计今日新增用户
        if (userCreatedAt >= todayStart) {
          todayNewUsers++;
        }

        // 统计注册时间分布（近7天）
        if (userCreatedAt >= sevenDaysAgo.getTime()) {
          const regDate = new Date(userCreatedAt).toISOString().split('T')[0];
          registrationData[regDate] = (registrationData[regDate] || 0) + 1;
        }

        // 获取用户最后登录时间和登入次数（从 UserMeta 获取）
        const lastLoginTime = userMeta?.lastActiveAt || 0;
        const loginCount = userMeta?.loginCount || 0;

        // 获取用户的所有播放记录
        const userPlayRecords = await storage.getAllPlayRecords(user.username);
        const records = Object.values(userPlayRecords);

        if (records.length === 0) {
          userStats.push({
            username: user.username,
            totalWatchTime: 0,
            totalPlays: 0,
            lastPlayTime: 0,
            recentRecords: [],
            avgWatchTime: 0,
            mostWatchedSource: '',
            registrationDays,
            lastLoginTime,
            loginCount,
            createdAt: userCreatedAt,
          });
          continue;
        }

        // 计算用户统计
        let userWatchTime = 0;
        let userLastPlayTime = 0;
        const userSourceCount: Record<string, number> = {};

        records.forEach((record) => {
          userWatchTime += record.play_time || 0;

          if (record.save_time > userLastPlayTime) {
            userLastPlayTime = record.save_time;
          }

          const sourceName = record.source_name || '未知来源';
          userSourceCount[sourceName] = (userSourceCount[sourceName] || 0) + 1;
          sourceCount[sourceName] = (sourceCount[sourceName] || 0) + 1;

          const recordDate = new Date(record.save_time);
          if (recordDate >= sevenDaysAgo) {
            const dateKey = recordDate.toISOString().split('T')[0];
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = { watchTime: 0, plays: 0 };
            }
            dailyData[dateKey].watchTime += record.play_time || 0;
            dailyData[dateKey].plays += 1;
          }
        });

        const recentRecords = records
          .sort((a, b) => (b.save_time || 0) - (a.save_time || 0))
          .slice(0, 10);

        let mostWatchedSource = '';
        let maxCount = 0;
        for (const [source, count] of Object.entries(userSourceCount)) {
          if (count > maxCount) {
            maxCount = count;
            mostWatchedSource = source;
          }
        }

        const userStat = {
          username: user.username,
          totalWatchTime: userWatchTime,
          totalPlays: records.length,
          lastPlayTime: userLastPlayTime,
          recentRecords,
          avgWatchTime: records.length > 0 ? userWatchTime / records.length : 0,
          mostWatchedSource,
          registrationDays,
          lastLoginTime: lastLoginTime || userCreatedAt,
          loginCount,
          createdAt: userCreatedAt,
        };

        userStats.push(userStat);

        totalWatchTime += userWatchTime;
        totalPlays += records.length;
      } catch {
        // 使用已获取的 userCreatedAt（在 try 块外定义）
        const firstDate = new Date(userCreatedAt);
        const currentDate = new Date();
        const firstDay = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
        const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const fallbackRegistrationDays = Math.floor((currentDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        userStats.push({
          username: user.username,
          totalWatchTime: 0,
          totalPlays: 0,
          lastPlayTime: 0,
          recentRecords: [],
          avgWatchTime: 0,
          mostWatchedSource: '',
          registrationDays: fallbackRegistrationDays,
          lastLoginTime: userCreatedAt,
          loginCount: 0,
          createdAt: userCreatedAt,
        });
      }
    }

    // 按观看时间降序排序
    userStats.sort((a, b) => b.totalWatchTime - a.totalWatchTime);

    // 整理热门来源数据
    const topSources = Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    // 整理每日统计数据
    const dailyStats: Array<{ date: string; watchTime: number; plays: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats.push({
        date: dateKey,
        watchTime: dailyData[dateKey]?.watchTime || 0,
        plays: dailyData[dateKey]?.plays || 0,
      });
    }

    // 整理注册趋势数据
    const registrationStats: Array<{ date: string; newUsers: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      registrationStats.push({
        date: dateKey,
        newUsers: registrationData[dateKey] || 0,
      });
    }

    // 计算活跃用户
    const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    const activeUsers = {
      daily: userStats.filter(user => user.lastLoginTime >= oneDayAgo).length,
      weekly: userStats.filter(user => user.lastLoginTime >= sevenDaysAgo.getTime()).length,
      monthly: userStats.filter(user => user.lastLoginTime >= thirtyDaysAgo).length,
    };

    const result: PlayStatsResult = {
      totalUsers: allUsers.length,
      totalWatchTime,
      totalPlays,
      avgWatchTimePerUser: allUsers.length > 0 ? totalWatchTime / allUsers.length : 0,
      avgPlaysPerUser: allUsers.length > 0 ? totalPlays / allUsers.length : 0,
      userStats,
      topSources,
      dailyStats,
      registrationStats: {
        todayNewUsers,
        totalRegisteredUsers,
        registrationTrend: registrationStats,
      },
      activeUsers,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('获取播放统计失败:', error);
    return NextResponse.json(
      { error: '获取播放统计失败' },
      { status: 500 }
    );
  }
}

/**
 * Clerk Integration Service
 * 
 * Integra com a API do Clerk para obter métricas de usuários,
 * login, retenção e atividade.
 */

import { clerkClient } from '@clerk/nextjs/server';

export interface ClerkUserMetrics {
  totalUsers: number;
  activeUsers: number; // Usuários com login nos últimos 7 dias
  lastWeekLogins: number;
  lastMonthLogins: number;
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface ClerkUserActivity {
  userId: string;
  email: string;
  lastSignInAt: Date | null;
  createdAt: Date;
  loginCount: number;
  isActive: boolean; // Login nos últimos 7 dias
}

export class ClerkService {
  /**
   * Busca métricas gerais de usuários do Clerk
   */
  static async getUserMetrics(): Promise<ClerkUserMetrics> {
    try {
      const client = await clerkClient();
      
      // Buscar todos os usuários
      const users = await client.users.getUserList({
        limit: 500, // Ajustar conforme necessário
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let activeUsers = 0;
      let lastWeekLogins = 0;
      let lastMonthLogins = 0;
      let day1Retention = 0;
      let day7Retention = 0;
      let day30Retention = 0;

      const totalUsers = users.data.length;

      for (const user of users.data) {
        const lastSignIn = user.lastSignInAt ? new Date(user.lastSignInAt) : null;
        const createdAt = new Date(user.createdAt);

        // Usuários ativos (últimos 7 dias)
        if (lastSignIn && lastSignIn >= sevenDaysAgo) {
          activeUsers++;
          lastWeekLogins++;
        }

        // Logins no último mês
        if (lastSignIn && lastSignIn >= thirtyDaysAgo) {
          lastMonthLogins++;
        }

        // Retenção D1 (usuários criados há 1 dia que fizeram login)
        const accountAge = now.getTime() - createdAt.getTime();
        if (accountAge >= 24 * 60 * 60 * 1000 && accountAge <= 48 * 60 * 60 * 1000) {
          if (lastSignIn && lastSignIn > createdAt) {
            day1Retention++;
          }
        }

        // Retenção D7 (usuários criados há 7 dias que fizeram login)
        if (accountAge >= 7 * 24 * 60 * 60 * 1000 && accountAge <= 8 * 24 * 60 * 60 * 1000) {
          if (lastSignIn && lastSignIn > new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            day7Retention++;
          }
        }

        // Retenção D30 (usuários criados há 30 dias que fizeram login)
        if (accountAge >= 30 * 24 * 60 * 60 * 1000 && accountAge <= 31 * 24 * 60 * 60 * 1000) {
          if (lastSignIn && lastSignIn > new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            day30Retention++;
          }
        }
      }

      return {
        totalUsers,
        activeUsers,
        lastWeekLogins,
        lastMonthLogins,
        retention: {
          day1: day1Retention,
          day7: day7Retention,
          day30: day30Retention,
        },
      };
    } catch (error) {
      console.error('[ClerkService] Erro ao buscar métricas:', error);
      throw error;
    }
  }

  /**
   * Busca atividade de um usuário específico
   */
  static async getUserActivity(userId: string): Promise<ClerkUserActivity | null> {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);

      if (!user) return null;

      const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
      const lastSignInAt = user.lastSignInAt ? new Date(user.lastSignInAt) : null;
      const createdAt = new Date(user.createdAt);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isActive = lastSignInAt ? lastSignInAt >= sevenDaysAgo : false;

      return {
        userId: user.id,
        email,
        lastSignInAt,
        createdAt,
        loginCount: 0, // Clerk não expõe contagem direta de logins
        isActive,
      };
    } catch (error) {
      console.error('[ClerkService] Erro ao buscar atividade do usuário:', error);
      return null;
    }
  }

  /**
   * Busca atividade de múltiplos usuários por email
   */
  static async getUsersActivityByEmails(emails: string[]): Promise<Map<string, ClerkUserActivity>> {
    try {
      const client = await clerkClient();
      const activityMap = new Map<string, ClerkUserActivity>();

      // Buscar todos os usuários do Clerk
      const users = await client.users.getUserList({
        limit: 500,
      });

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const user of users.data) {
        const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
        
        if (emails.includes(email.toLowerCase())) {
          const lastSignInAt = user.lastSignInAt ? new Date(user.lastSignInAt) : null;
          const createdAt = new Date(user.createdAt);
          const isActive = lastSignInAt ? lastSignInAt >= sevenDaysAgo : false;

          activityMap.set(email.toLowerCase(), {
            userId: user.id,
            email,
            lastSignInAt,
            createdAt,
            loginCount: 0,
            isActive,
          });
        }
      }

      return activityMap;
    } catch (error) {
      console.error('[ClerkService] Erro ao buscar atividade de múltiplos usuários:', error);
      return new Map();
    }
  }

  /**
   * Busca todos os usuários do Clerk com suas atividades
   */
  static async getAllUsersActivity(): Promise<ClerkUserActivity[]> {
    try {
      const client = await clerkClient();
      const users = await client.users.getUserList({
        limit: 500,
      });

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return users.data.map(user => {
        const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
        const lastSignInAt = user.lastSignInAt ? new Date(user.lastSignInAt) : null;
        const createdAt = new Date(user.createdAt);
        const isActive = lastSignInAt ? lastSignInAt >= sevenDaysAgo : false;

        return {
          userId: user.id,
          email,
          lastSignInAt,
          createdAt,
          loginCount: 0,
          isActive,
        };
      });
    } catch (error) {
      console.error('[ClerkService] Erro ao buscar todos os usuários:', error);
      return [];
    }
  }
}

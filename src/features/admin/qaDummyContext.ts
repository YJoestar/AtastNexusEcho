/**
 * Inert app context for the QA simulator: the simulator supplies its own data,
 * so the real session-backed provider must not be consulted.
 * (Separate from QAPlayerShell.tsx so that file exports only a component.)
 */
import type { AppContextValue } from '@/app/providers/AppProvider'

export const DUMMY_APP_CONTEXT: AppContextValue = {
  player: null,
  team: null,
  role: null,
  isAuthenticated: false,
  isInitializing: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshGameState: async () => {},
  refreshTeamProgress: async () => {},
  gameState: null,
  teamProgress: null,
  notifications: [],
  unreadCount: 0,
  markNotificationRead: () => {},
  refreshNotifications: async () => {},
  markAllNotificationsRead: async () => {},
}

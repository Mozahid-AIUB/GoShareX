export const COLLECTIONS = {
  USERS: 'users',
  ACTIVE_RIDERS: 'active_riders',
  RIDES: 'rides',
  CHATS: 'chats',
  POSTS: 'posts',
  FARE_TABLE: 'fare_table',
  REPORTS: 'reports',
} as const;

export const RTDB_PATHS = {
  ACTIVE_RIDERS: 'active_riders',
  USER_LOCATION: (uid: string) => `active_riders/${uid}`,
} as const;

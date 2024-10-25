// src/types/User.ts
export interface User {
    uid: string; // Unique identifier for the user
    boardPermissions: {
      [boardId: string]: 'read' | 'write'; // Permissions for each board
    };
  }
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_waiting_users: {
        Row: {
          board_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_waiting_users_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_waiting_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          cohort: number | null
          created_at: string
          description: string | null
          first_day: string | null
          id: string
          last_day: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cohort?: number | null
          created_at?: string
          description?: string | null
          first_day?: string | null
          id: string
          last_day?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cohort?: number | null
          created_at?: string
          description?: string | null
          first_day?: string | null
          id?: string
          last_day?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          count_of_replies: number
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
          user_name: string
          user_profile_image: string | null
        }
        Insert: {
          content: string
          count_of_replies?: number
          created_at?: string
          id: string
          post_id: string
          updated_at?: string
          user_id: string
          user_name?: string
          user_profile_image?: string | null
        }
        Update: {
          content?: string
          count_of_replies?: number
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          user_profile_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          board_id: string
          content: string
          content_json: Json | null
          id: string
          saved_at: string
          title: string
          user_id: string
        }
        Insert: {
          board_id: string
          content?: string
          content_json?: Json | null
          id: string
          saved_at?: string
          title?: string
          user_id: string
        }
        Update: {
          board_id?: string
          content?: string
          content_json?: Json | null
          id?: string
          saved_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          payload: Json
          retry_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          payload: Json
          retry_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          payload?: Json
          retry_count?: number | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          user_name: string
          user_profile_image: string | null
        }
        Insert: {
          created_at?: string
          id: string
          post_id: string
          user_id: string
          user_name?: string
          user_profile_image?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          user_name?: string
          user_profile_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_diffs: {
        Row: {
          board_id: string | null
          created_at: string
          feed_type: string
          firestore_ids: string[] | null
          id: number
          missing_in_firestore: string[] | null
          missing_in_postgres: string[] | null
          order_mismatch: boolean | null
          postgres_ids: string[] | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          feed_type: string
          firestore_ids?: string[] | null
          id?: number
          missing_in_firestore?: string[] | null
          missing_in_postgres?: string[] | null
          order_mismatch?: boolean | null
          postgres_ids?: string[] | null
        }
        Update: {
          board_id?: string | null
          created_at?: string
          feed_type?: string
          firestore_ids?: string[] | null
          id?: number
          missing_in_firestore?: string[] | null
          missing_in_postgres?: string[] | null
          order_mismatch?: boolean | null
          postgres_ids?: string[] | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          actor_profile_image: string | null
          board_id: string
          comment_id: string | null
          created_at: string
          id: string
          like_id: string | null
          message: string
          post_id: string
          reaction_id: string | null
          read: boolean
          recipient_id: string
          reply_id: string | null
          type: string
        }
        Insert: {
          actor_id: string
          actor_profile_image?: string | null
          board_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          like_id?: string | null
          message: string
          post_id: string
          reaction_id?: string | null
          read?: boolean
          recipient_id: string
          reply_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string
          actor_profile_image?: string | null
          board_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          like_id?: string | null
          message?: string
          post_id?: string
          reaction_id?: string | null
          read?: boolean
          recipient_id?: string
          reply_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          author_name: string
          board_id: string
          content: string
          content_json: Json | null
          content_length: number | null
          content_preview: string | null
          count_of_comments: number
          count_of_likes: number
          count_of_replies: number
          created_at: string
          engagement_score: number
          id: string
          thumbnail_image_url: string | null
          title: string
          updated_at: string
          visibility: string | null
          week_days_from_first_day: number | null
        }
        Insert: {
          author_id: string
          author_name: string
          board_id: string
          content?: string
          content_json?: Json | null
          content_length?: number | null
          content_preview?: string | null
          count_of_comments?: number
          count_of_likes?: number
          count_of_replies?: number
          created_at?: string
          engagement_score?: number
          id: string
          thumbnail_image_url?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
          week_days_from_first_day?: number | null
        }
        Update: {
          author_id?: string
          author_name?: string
          board_id?: string
          content?: string
          content_json?: Json | null
          content_length?: number | null
          content_preview?: string | null
          count_of_comments?: number
          count_of_likes?: number
          count_of_replies?: number
          created_at?: string
          engagement_score?: number
          id?: string
          thumbnail_image_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
          week_days_from_first_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          reaction_type: string
          reply_id: string | null
          user_id: string
          user_name: string
          user_profile_image: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id: string
          reaction_type: string
          reply_id?: string | null
          user_id: string
          user_name?: string
          user_profile_image?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          reaction_type?: string
          reply_id?: string | null
          user_id?: string
          user_name?: string
          user_profile_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          comment_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
          user_name: string
          user_profile_image: string | null
        }
        Insert: {
          comment_id: string
          content: string
          created_at?: string
          id: string
          post_id: string
          updated_at?: string
          user_id: string
          user_name?: string
          user_profile_image?: string | null
        }
        Update: {
          comment_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          user_profile_image?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replies_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          board_id: string
          created_at: string
          id: string
          keep_text: string | null
          nps: number | null
          problem_text: string | null
          reviewer_id: string
          reviewer_nickname: string | null
          try_text: string | null
          will_continue: boolean | null
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          keep_text?: string | null
          nps?: number | null
          problem_text?: string | null
          reviewer_id: string
          reviewer_nickname?: string | null
          try_text?: string | null
          will_continue?: boolean | null
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          keep_text?: string | null
          nps?: number | null
          problem_text?: string | null
          reviewer_id?: string
          reviewer_nickname?: string | null
          try_text?: string | null
          will_continue?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      uid_mapping: {
        Row: {
          firebase_uid: string
          supabase_uuid: string
        }
        Insert: {
          firebase_uid: string
          supabase_uuid: string
        }
        Update: {
          firebase_uid?: string
          supabase_uuid?: string
        }
        Relationships: []
      }
      user_board_permissions: {
        Row: {
          board_id: string
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_board_permissions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_board_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          id: string
          known_buddy_uid: string | null
          nickname: string | null
          phone_number: string | null
          profile_photo_url: string | null
          real_name: string | null
          recovery_status: string | null
          referrer: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id: string
          known_buddy_uid?: string | null
          nickname?: string | null
          phone_number?: string | null
          profile_photo_url?: string | null
          real_name?: string | null
          recovery_status?: string | null
          referrer?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          known_buddy_uid?: string | null
          nickname?: string | null
          phone_number?: string | null
          profile_photo_url?: string | null
          real_name?: string | null
          recovery_status?: string | null
          referrer?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_known_buddy_uid_fkey"
            columns: ["known_buddy_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      write_ops: {
        Row: {
          created_at: string
          op_id: string
        }
        Insert: {
          created_at?: string
          op_id: string
        }
        Update: {
          created_at?: string
          op_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_counter_integrity: {
        Args: never
        Returns: {
          actual_comments: number
          actual_likes: number
          actual_replies: number
          post_id: string
          stored_comments: number
          stored_likes: number
          stored_replies: number
        }[]
      }
      get_app_config: { Args: { config_key: string }; Returns: string }
      try_acquire_write_lock: { Args: { p_op_id: string }; Returns: boolean }
      update_comment_reply_counts: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


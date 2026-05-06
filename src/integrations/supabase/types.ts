export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_message_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_dismissals_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_messages: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          title?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          open_link: boolean
          reward_value: number | null
          title: string
          url: string
          view_time: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          open_link?: boolean
          reward_value?: number | null
          title: string
          url: string
          view_time?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          open_link?: boolean
          reward_value?: number | null
          title?: string
          url?: string
          view_time?: number
        }
        Relationships: []
      }
      advertiser_leads: {
        Row: {
          ad_description: string | null
          ad_link: string
          clicks_amount: number
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          ad_description?: string | null
          ad_link: string
          clicks_amount: number
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          status?: string
          total_value: number
          updated_at?: string
        }
        Update: {
          ad_description?: string | null
          ad_link?: string
          clicks_amount?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      balance_adjustments: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          ad_id: string
          clicked_at: string
          earned_value: number
          id: string
          ip_address: string | null
          referral_commission_paid: boolean | null
          user_id: string
        }
        Insert: {
          ad_id: string
          clicked_at?: string
          earned_value?: number
          id?: string
          ip_address?: string | null
          referral_commission_paid?: boolean | null
          user_id: string
        }
        Update: {
          ad_id?: string
          clicked_at?: string
          earned_value?: number
          id?: string
          ip_address?: string | null
          referral_commission_paid?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          plan_id: string
          proof_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          plan_id: string
          proof_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          plan_id?: string
          proof_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          click_value: number
          created_at: string
          daily_click_limit: number
          id: string
          is_active: boolean
          name: string
          price: number
          referral_commission: number
        }
        Insert: {
          click_value?: number
          created_at?: string
          daily_click_limit?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          referral_commission?: number
        }
        Update: {
          click_value?: number
          created_at?: string
          daily_click_limit?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          referral_commission?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          block_message: string | null
          cpf: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          id: string
          is_blocked: boolean
          name: string
          phone: string | null
          pix_key: string | null
          referred_by: string | null
          signup_ip: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          block_message?: string | null
          cpf?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          id?: string
          is_blocked?: boolean
          name?: string
          phone?: string | null
          pix_key?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          block_message?: string | null
          cpf?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          id?: string
          is_blocked?: boolean
          name?: string
          phone?: string | null
          pix_key?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_rate: number
          confirmed_at: string | null
          created_at: string
          id: string
          level: number
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          commission_rate?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          level?: number
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          commission_rate?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          level?: number
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          message: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          message?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean
          plan_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          cpf: string | null
          holder_name: string | null
          id: string
          phone: string | null
          pix_key: string | null
          processed_at: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          cpf?: string | null
          holder_name?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          cpf?: string | null
          holder_name?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      suspicious_accounts: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          email: string | null
          has_duplicate_name: boolean | null
          is_blocked: boolean | null
          name: string | null
          referrals_last_24h: number | null
          risk_score: number | null
          shares_device: boolean | null
          shares_ip: boolean | null
          signup_ip: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_user_setup: {
        Args: {
          avatar_url_input?: string
          email_input?: string
          name_input?: string
          referrer_id?: string
        }
        Returns: undefined
      }
      get_suspicious_accounts: {
        Args: never
        Returns: {
          created_at: string | null
          device_fingerprint: string | null
          email: string | null
          has_duplicate_name: boolean | null
          is_blocked: boolean | null
          name: string | null
          referrals_last_24h: number | null
          risk_score: number | null
          shares_device: boolean | null
          shares_ip: boolean | null
          signup_ip: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "suspicious_accounts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_suspicious_email: { Args: { _email: string }; Returns: boolean }
      register_device_fingerprint: {
        Args: { fp_input: string }
        Returns: undefined
      }
      register_signup_ip: { Args: { ip_input: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

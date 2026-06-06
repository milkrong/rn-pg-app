export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_usage: {
        Row: {
          messages_used: number;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          messages_used?: number;
          usage_date?: string;
          user_id: string;
        };
        Update: {
          messages_used?: number;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coach_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          role: "user" | "assistant";
          session_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role: "user" | "assistant";
          session_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role?: "user" | "assistant";
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "coach_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      coach_sessions: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cycle_logs: {
        Row: {
          client_updated_at: string;
          created_at: string;
          happened_on: string;
          id: string;
          local_id: string;
          log_type: "period" | "symptom" | "temperature" | "ovulation_test" | "intercourse" | "supplement";
          payload: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_updated_at: string;
          created_at?: string;
          happened_on: string;
          id?: string;
          local_id: string;
          log_type: "period" | "symptom" | "temperature" | "ovulation_test" | "intercourse" | "supplement";
          payload?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          client_updated_at?: string;
          created_at?: string;
          happened_on?: string;
          id?: string;
          local_id?: string;
          log_type?: "period" | "symptom" | "temperature" | "ovulation_test" | "intercourse" | "supplement";
          payload?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          expires_at: string | null;
          plan: "free" | "pro";
          revenuecat_customer_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          expires_at?: string | null;
          plan?: "free" | "pro";
          revenuecat_customer_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          expires_at?: string | null;
          plan?: "free" | "pro";
          revenuecat_customer_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      healthkit_sync_cursors: {
        Row: {
          capability: string;
          cursor_value: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          capability: string;
          cursor_value: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          capability?: string;
          cursor_value?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Auto-generated Supabase types for the Ponder database.
 *
 * To regenerate, run with local Supabase running:
 *   pnpm --filter @wgenie/fusion-supabase-ponder gen:types
 *
 * These types mirror the tables defined in packages/ponder/ponder.schema.ts.
 * Tables are automatically created by Ponder when indexing starts.
 */

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
      transfer_event: {
        Row: {
          id: string;
          amount: string; // bigint stored as text
          timestamp: number;
          from: string;
          to: string;
        };
        Insert: {
          id: string;
          amount: string;
          timestamp: number;
          from: string;
          to: string;
        };
        Update: {
          id?: string;
          amount?: string;
          timestamp?: number;
          from?: string;
          to?: string;
        };
        Relationships: [];
      };
      deposit_event: {
        Row: {
          id: string;
          chain_id: number;
          vault_address: string;
          sender: string;
          receiver: string;
          assets: string; // bigint stored as text
          shares: string; // bigint stored as text
          timestamp: number;
          transaction_hash: string;
        };
        Insert: {
          id: string;
          chain_id: number;
          vault_address: string;
          sender: string;
          receiver: string;
          assets: string;
          shares: string;
          timestamp: number;
          transaction_hash: string;
        };
        Update: {
          id?: string;
          chain_id?: number;
          vault_address?: string;
          sender?: string;
          receiver?: string;
          assets?: string;
          shares?: string;
          timestamp?: number;
          transaction_hash?: string;
        };
        Relationships: [];
      };
      withdrawal_event: {
        Row: {
          id: string;
          chain_id: number;
          vault_address: string;
          sender: string;
          receiver: string;
          owner: string;
          assets: string; // bigint stored as text
          shares: string; // bigint stored as text
          timestamp: number;
          transaction_hash: string;
        };
        Insert: {
          id: string;
          chain_id: number;
          vault_address: string;
          sender: string;
          receiver: string;
          owner: string;
          assets: string;
          shares: string;
          timestamp: number;
          transaction_hash: string;
        };
        Update: {
          id?: string;
          chain_id?: number;
          vault_address?: string;
          sender?: string;
          receiver?: string;
          owner?: string;
          assets?: string;
          shares?: string;
          timestamp?: number;
          transaction_hash?: string;
        };
        Relationships: [];
      };
      depositor: {
        Row: {
          chain_id: number;
          vault_address: string;
          depositor_address: string;
          share_balance: string; // bigint stored as text
          first_activity: number;
          last_activity: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          depositor_address: string;
          share_balance: string;
          first_activity: number;
          last_activity: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          depositor_address?: string;
          share_balance?: string;
          first_activity?: number;
          last_activity?: number;
        };
        Relationships: [];
      };
      deposit_buckets_2_hours: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string; // bigint stored as text
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      deposit_buckets_8_hours: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      deposit_buckets_1_day: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      deposit_buckets_4_days: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      withdraw_buckets_2_hours: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      withdraw_buckets_8_hours: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      withdraw_buckets_1_day: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      withdraw_buckets_4_days: {
        Row: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Insert: {
          chain_id: number;
          vault_address: string;
          bucket_id: number;
          sum: string;
          count: number;
        };
        Update: {
          chain_id?: number;
          vault_address?: string;
          bucket_id?: number;
          sum?: string;
          count?: number;
        };
        Relationships: [];
      };
      fuse_event: {
        Row: {
          id: string;
          chain_id: number;
          vault_address: string;
          block_number: number;
          timestamp: number;
          transaction_hash: string;
          log_index: number;
          event_name: string;
          args: Json;
        };
        Insert: {
          id: string;
          chain_id: number;
          vault_address: string;
          block_number: number;
          timestamp: number;
          transaction_hash: string;
          log_index: number;
          event_name: string;
          args: Json;
        };
        Update: {
          id?: string;
          chain_id?: number;
          vault_address?: string;
          block_number?: number;
          timestamp?: number;
          transaction_hash?: string;
          log_index?: number;
          event_name?: string;
          args?: Json;
        };
        Relationships: [];
      };
      treasury_deposit: {
        Row: {
          id: string;
          chain_id: number;
          treasury_address: string;
          user: string;
          amount: string;
          timestamp: number;
          transaction_hash: string;
        };
        Insert: {
          id: string;
          chain_id: number;
          treasury_address: string;
          user: string;
          amount: string;
          timestamp: number;
          transaction_hash: string;
        };
        Update: {
          id?: string;
          chain_id?: number;
          treasury_address?: string;
          user?: string;
          amount?: string;
          timestamp?: number;
          transaction_hash?: string;
        };
        Relationships: [];
      };
      treasury_execution: {
        Row: {
          id: string;
          chain_id: number;
          treasury_address: string;
          target: string;
          value: string;
          data: string;
          timestamp: number;
          transaction_hash: string;
        };
        Insert: {
          id: string;
          chain_id: number;
          treasury_address: string;
          target: string;
          value: string;
          data: string;
          timestamp: number;
          transaction_hash: string;
        };
        Update: {
          id?: string;
          chain_id?: number;
          treasury_address?: string;
          target?: string;
          value?: string;
          data?: string;
          timestamp?: number;
          transaction_hash?: string;
        };
        Relationships: [];
      };
      telegram_settings: {
        Row: {
          wallet_address: string;
          chat_id: string;
          display_name: string;
          notif_tx_executed: boolean;
          notif_guardrail: boolean;
          notif_strategy_change: boolean;
          notif_daily_report: boolean;
          daily_report_hour: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wallet_address: string;
          chat_id: string;
          display_name?: string;
          notif_tx_executed?: boolean;
          notif_guardrail?: boolean;
          notif_strategy_change?: boolean;
          notif_daily_report?: boolean;
          daily_report_hour?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wallet_address?: string;
          chat_id?: string;
          display_name?: string;
          notif_tx_executed?: boolean;
          notif_guardrail?: boolean;
          notif_strategy_change?: boolean;
          notif_daily_report?: boolean;
          daily_report_hour?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      treasury_manager: {
        Row: {
          id: string;
          chain_id: number;
          treasury_address: string;
          manager: string;
          timestamp: number;
          transaction_hash: string;
        };
        Insert: {
          id: string;
          chain_id: number;
          treasury_address: string;
          manager: string;
          timestamp: number;
          transaction_hash: string;
        };
        Update: {
          id?: string;
          chain_id?: number;
          treasury_address?: string;
          manager?: string;
          timestamp?: number;
          transaction_hash?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

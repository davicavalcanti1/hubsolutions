export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email: string | null;
          phone: string | null;
          logo_url: string | null;
          db_tier: "pool" | "silo";
          db_connection_string: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          email?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          db_tier?: "pool" | "silo";
          db_connection_string?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          email?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          db_tier?: "pool" | "silo";
          db_connection_string?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          price_monthly: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          price_monthly?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          price_monthly?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      company_modules: {
        Row: {
          id: string;
          company_id: string;
          module_key: string;
          active: boolean;
          activated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          module_key: string;
          active?: boolean;
          activated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          module_key?: string;
          active?: boolean;
          activated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string;
          full_name: string;
          email: string;
          role: "superadmin" | "admin" | "user";
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          full_name: string;
          email: string;
          role?: "superadmin" | "admin" | "user";
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          full_name?: string;
          email?: string;
          role?: "superadmin" | "admin" | "user";
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      invitations: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          role: "admin" | "user";
          token: string;
          accepted: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          email: string;
          role?: "admin" | "user";
          token?: string;
          accepted?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          email?: string;
          role?: "admin" | "user";
          token?: string;
          accepted?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

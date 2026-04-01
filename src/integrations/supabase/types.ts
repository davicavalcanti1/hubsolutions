export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      plans: {
        Row: {
          id: string;
          name: string;
          storage_limit_bytes: number;
          max_users: number;
          price_monthly: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          storage_limit_bytes: number;
          max_users?: number;
          price_monthly?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          storage_limit_bytes?: number;
          max_users?: number;
          price_monthly?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email: string | null;
          phone: string | null;
          logo_url: string | null;
          plan_id: string | null;
          display_name: string | null;
          favicon_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          active: boolean;
          storage_used_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          email?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          plan_id?: string | null;
          display_name?: string | null;
          favicon_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          active?: boolean;
          storage_used_bytes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          email?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          plan_id?: string | null;
          display_name?: string | null;
          favicon_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          active?: boolean;
          storage_used_bytes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          supabase_user_id: string | null;
          company_id: string | null;
          full_name: string;
          email: string;
          role: "superadmin" | "admin" | "user";
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          supabase_user_id?: string | null;
          company_id?: string | null;
          full_name: string;
          email: string;
          role?: "superadmin" | "admin" | "user";
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          supabase_user_id?: string | null;
          company_id?: string | null;
          full_name?: string;
          email?: string;
          role?: "superadmin" | "admin" | "user";
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
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
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email: string | null;
          plan_id: string;
          db_tier: "supabase" | "local";
          db_connection_string: string | null;
          storage_used_bytes: number;
          active: boolean;
          display_name: string | null;
          logo_url: string | null;
          favicon_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          email?: string | null;
          plan_id: string;
          db_tier?: "supabase" | "local";
          db_connection_string?: string | null;
          storage_used_bytes?: number;
          active?: boolean;
          display_name?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          email?: string | null;
          plan_id?: string;
          db_tier?: "supabase" | "local";
          db_connection_string?: string | null;
          storage_used_bytes?: number;
          active?: boolean;
          display_name?: string | null;
          logo_url?: string | null;
          favicon_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          }
        ];
      };
      tenant_users: {
        Row: {
          id: string;
          tenant_id: string;
          supabase_user_id: string;
          full_name: string;
          email: string;
          role: "admin" | "user";
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supabase_user_id: string;
          full_name: string;
          email: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          supabase_user_id?: string;
          full_name?: string;
          email?: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      feature_requests: {
        Row: {
          id: string;
          tenant_id: string | null;
          company_id: string | null;
          title: string;
          description: string | null;
          status: "pending" | "reviewing" | "planned" | "in_progress" | "done" | "rejected";
          votes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          company_id?: string | null;
          title: string;
          description?: string | null;
          status?: "pending" | "reviewing" | "planned" | "in_progress" | "done" | "rejected";
          votes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          company_id?: string | null;
          title?: string;
          description?: string | null;
          status?: "pending" | "reviewing" | "planned" | "in_progress" | "done" | "rejected";
          votes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feature_requests_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      usage_events: {
        Row: {
          id: string;
          tenant_id: string | null;
          company_id: string | null;
          event_type: "insert" | "update" | "delete" | "storage_add" | "storage_remove";
          table_name: string | null;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          company_id?: string | null;
          event_type: "insert" | "update" | "delete" | "storage_add" | "storage_remove";
          table_name?: string | null;
          size_bytes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          company_id?: string | null;
          event_type?: "insert" | "update" | "delete" | "storage_add" | "storage_remove";
          table_name?: string | null;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      occurrences: {
        Row: {
          id: string;
          company_id: string;
          protocolo: string;
          tipo: string;
          subtipo: string | null;
          status: string;
          triagem: string | null;
          triagem_por: string | null;
          triagem_em: string | null;
          dados: Json;
          desfecho: Json | null;
          historico_status: Json;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          protocolo: string;
          tipo: string;
          subtipo?: string | null;
          status?: string;
          triagem?: string | null;
          triagem_por?: string | null;
          triagem_em?: string | null;
          dados?: Json;
          desfecho?: Json | null;
          historico_status?: Json;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          protocolo?: string;
          tipo?: string;
          subtipo?: string | null;
          status?: string;
          triagem?: string | null;
          triagem_por?: string | null;
          triagem_em?: string | null;
          dados?: Json;
          desfecho?: Json | null;
          historico_status?: Json;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "occurrences_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      locais: {
        Row: {
          id: string;
          company_id: string;
          nome: string;
          descricao: string | null;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          nome: string;
          descricao?: string | null;
          ativo?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          nome?: string;
          descricao?: string | null;
          ativo?: boolean;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locais_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      funcionarios: {
        Row: {
          id: string;
          company_id: string;
          nome: string;
          cargo: string | null;
          setor: string | null;
          email: string | null;
          telefone: string | null;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          nome: string;
          cargo?: string | null;
          setor?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          nome?: string;
          cargo?: string | null;
          setor?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funcionarios_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      medicos: {
        Row: {
          id: string;
          company_id: string;
          nome: string;
          crm: string | null;
          especialidade: string | null;
          email: string | null;
          telefone: string | null;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          nome: string;
          crm?: string | null;
          especialidade?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          nome?: string;
          crm?: string | null;
          especialidade?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medicos_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      escalas: {
        Row: {
          id: string;
          company_id: string;
          nome: string;
          mes: number;
          ano: number;
          local_id: string | null;
          dados: Json;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          nome: string;
          mes: number;
          ano: number;
          local_id?: string | null;
          dados?: Json;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          nome?: string;
          mes?: number;
          ano?: number;
          local_id?: string | null;
          dados?: Json;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escalas_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escalas_local_id_fkey";
            columns: ["local_id"];
            referencedRelation: "locais";
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

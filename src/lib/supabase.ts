import {
  createClient,
  type SupportedStorage,
  type SupabaseClient,
} from "@supabase/supabase-js";

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
      course_enrollments: {
        Row: {
          user_id: string;
          course_id: string;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          course_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          role: "student" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string;
          phone?: string;
          role?: "student" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          price: number;
          thumbnail_url: string;
          is_free: boolean;
          category: "نحو" | "صرف" | "بلاغة" | "أدب";
          level: string;
          lesson_count: number;
          duration_text: string;
          grade: string | null;
          academic_system: string | null;
          term: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description?: string;
          price?: number;
          thumbnail_url?: string;
          is_free?: boolean;
          category?: "نحو" | "صرف" | "بلاغة" | "أدب";
          level?: string;
          lesson_count?: number;
          duration_text?: string;
          grade?: string | null;
          academic_system?: string | null;
          term?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          price?: number;
          thumbnail_url?: string;
          is_free?: boolean;
          category?: "نحو" | "صرف" | "بلاغة" | "أدب";
          level?: string;
          lesson_count?: number;
          duration_text?: string;
          grade?: string | null;
          academic_system?: string | null;
          term?: string | null;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          summary: string;
          video_src: string;
          duration: string;
          key_points: Json;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          course_id: string;
          title: string;
          summary?: string;
          video_src?: string;
          duration?: string;
          key_points?: Json;
          sort_order?: number;
        };
        Update: {
          course_id?: string;
          title?: string;
          summary?: string;
          video_src?: string;
          duration?: string;
          key_points?: Json;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          amount: number;
          payment_method:
            | "Vodafone Cash"
            | "Etisalat Cash"
            | "InstaPay"
            | "Fawry"
            | "Orange Cash";
          sender_wallet_number: string;
          receipt_image_path: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          amount?: number;
          payment_method:
            | "Vodafone Cash"
            | "Etisalat Cash"
            | "InstaPay"
            | "Fawry"
            | "Orange Cash";
          sender_wallet_number: string;
          receipt_image_path: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_progress: {
        Row: {
          user_id: string;
          progress: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          progress: Json;
          updated_at?: string;
        };
        Update: {
          progress?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_activity_log: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          details: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string;
          action: string;
          details?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: "assistant" | "student";
          text: string;
          source: "ai" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: "assistant" | "student";
          text: string;
          source?: "ai" | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_access_course: {
        Args: { p_course_id: string };
        Returns: boolean;
      };

      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_lesson_catalog: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          course_id: string;
          title: string;
          summary: string;
          duration: string;
          key_points: Json;
          sort_order: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let supabaseClient: SupabaseClient<Database> | undefined;
let rememberSession = true;

export function isSupabaseConfigured(): boolean {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  return Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY);
}

const sessionStorageAdapter: SupportedStorage = {
  getItem(key) {
    return (
      window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    );
  },
  setItem(key, value) {
    const storage = rememberSession
      ? window.localStorage
      : window.sessionStorage;
    const otherStorage = rememberSession
      ? window.sessionStorage
      : window.localStorage;
    storage.setItem(key, value);
    otherStorage.removeItem(key);
  },
  removeItem(key) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
  if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      "أضف VITE_SUPABASE_URL وVITE_SUPABASE_ANON_KEY إلى ملف .env.local للاتصال بـ Supabase.",
    );
  }

  supabaseClient = createClient<Database>(
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: sessionStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  );
  return supabaseClient;
}

export function setRememberSession(remember: boolean): void {
  rememberSession = remember;
}

export async function safeSupabaseQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>,
  retries = 3,
  delayMs = 500
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await queryFn();
      if (!result.error && result.data !== null) {
        return result;
      }
      lastError = result.error;
      if (result.error?.code === "PGRST116" || result.error?.status === 401) {
        break;
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return { data: null, error: lastError };
}

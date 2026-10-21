export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ForeignKey<
  Name extends string,
  Column extends string,
  Relation extends string,
> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Relation;
  referencedColumns: ["id"];
};

type RowOf<T> = T extends Table<infer Row, unknown, unknown> ? Row : never;

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "student" | "admin";
  created_at: string;
  updated_at: string;
}

interface CourseRow {
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
}

interface LessonRow {
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
}

interface OrderRow {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  payment_method:
    "Vodafone Cash" | "Etisalat Cash" | "InstaPay" | "Fawry" | "Orange Cash";
  sender_wallet_number: string;
  receipt_image_path: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface EnrollmentRow {
  user_id: string;
  course_id: string;
  created_at: string;
}

interface ProgressRow {
  user_id: string;
  progress: Json;
  updated_at: string;
}

interface AdminActivityRow {
  id: string;
  actor_id: string;
  action: string;
  details: string;
  created_at: string;
}

interface AIConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AIMessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "assistant" | "student";
  text: string;
  source: "ai" | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Pick<ProfileRow, "id"> &
          Partial<Pick<ProfileRow, "full_name" | "email" | "phone" | "role">>,
        Partial<Pick<ProfileRow, "full_name" | "phone">>
      >;
      courses: Omit<
        Table<
          CourseRow,
          Pick<CourseRow, "id" | "title"> &
            Partial<Omit<CourseRow, "id" | "title" | "created_at">>,
          Partial<Omit<CourseRow, "created_at">>
        >,
        "Relationships"
      > & {
        Relationships: [
          ForeignKey<"courses_created_by_fkey", "created_by", "profiles">,
        ];
      };
      lessons: Omit<
        Table<
          LessonRow,
          Pick<LessonRow, "id" | "course_id" | "title"> &
            Partial<
              Omit<
                LessonRow,
                "id" | "course_id" | "title" | "created_at" | "updated_at"
              >
            >,
          Partial<Omit<LessonRow, "created_at">>
        >,
        "Relationships"
      > & {
        Relationships: [
          ForeignKey<"lessons_course_id_fkey", "course_id", "courses">,
        ];
      };
      orders: Omit<
        Table<
          OrderRow,
          Pick<
            OrderRow,
            | "user_id"
            | "course_id"
            | "payment_method"
            | "sender_wallet_number"
            | "receipt_image_path"
          > &
            Partial<Pick<OrderRow, "amount" | "status" | "created_at">>,
          Partial<Pick<OrderRow, "status">>
        >,
        "Relationships"
      > & {
        Relationships: [
          ForeignKey<"orders_course_id_fkey", "course_id", "courses">,
          ForeignKey<"orders_user_id_fkey", "user_id", "profiles">,
        ];
      };
      course_enrollments: Table<
        EnrollmentRow,
        Pick<EnrollmentRow, "user_id" | "course_id"> &
          Partial<Pick<EnrollmentRow, "created_at">>,
        never
      >;
      student_progress: Table<
        ProgressRow,
        Pick<ProgressRow, "user_id" | "progress"> &
          Partial<Pick<ProgressRow, "updated_at">>,
        Partial<Pick<ProgressRow, "progress" | "updated_at">>
      >;
      admin_activity_log: Table<
        AdminActivityRow,
        Pick<AdminActivityRow, "action"> &
          Partial<
            Pick<AdminActivityRow, "actor_id" | "details" | "created_at">
          >,
        never
      >;
      ai_conversations: Table<
        AIConversationRow,
        Pick<AIConversationRow, "user_id"> &
          Partial<Pick<AIConversationRow, "id" | "title" | "created_at" | "updated_at">>,
        Partial<Pick<AIConversationRow, "title" | "updated_at">>
      >;
      ai_messages: Omit<
        Table<
          AIMessageRow,
          Pick<AIMessageRow, "conversation_id" | "user_id" | "role" | "text"> &
            Partial<Pick<AIMessageRow, "id" | "source" | "created_at">>,
          never
        >,
        "Relationships"
      > & {
        Relationships: [
          ForeignKey<
            "ai_messages_conversation_id_fkey",
            "conversation_id",
            "ai_conversations"
          >,
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      can_access_course: {
        Args: { p_course_id: string };
        Returns: boolean;
      };
      get_lesson_catalog: {
        Args: Record<PropertyKey, never>;
        Returns: Pick<
          RowOf<Database["public"]["Tables"]["lessons"]>,
          "id" | "course_id" | "title" | "summary" | "duration" | "key_points"
        >[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

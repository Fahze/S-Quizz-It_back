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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      avatar: {
        Row: {
          idAvatar: number
          urlavatar: string
        }
        Insert: {
          idAvatar?: number
          urlavatar: string
        }
        Update: {
          idAvatar?: number
          urlavatar?: string
        }
        Relationships: []
      }
      historiquePartie: {
        Row: {
          idPartie: number
          idProfile: number
          score: number
        }
        Insert: {
          idPartie: number
          idProfile: number
          score: number
        }
        Update: {
          idPartie?: number
          idProfile?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "historiquePartie_idPartie_fkey"
            columns: ["idPartie"]
            isOneToOne: false
            referencedRelation: "partie"
            referencedColumns: ["id"]
          },
        ]
      }
      partie: {
        Row: {
          date: string
          id: number
        }
        Insert: {
          date?: string
          id?: number
        }
        Update: {
          date?: string
          id?: number
        }
        Relationships: []
      }
      profile: {
        Row: {
          avatar: string | null
          elo: number
          id: number
          idUser: string
          pseudo: string
        }
        Insert: {
          avatar?: string | null
          elo?: number
          id?: number
          idUser: string
          pseudo: string
        }
        Update: {
          avatar?: string | null
          elo?: number
          id?: number
          idUser?: string
          pseudo?: string
        }
        Relationships: []
      }
      question: {
        Row: {
          dateCreation: string
          id: number
          idAuteur: number | null
          label: string
          niveauDifficulte: number
        }
        Insert: {
          dateCreation?: string
          id?: number
          idAuteur?: number | null
          label: string
          niveauDifficulte?: number
        }
        Update: {
          dateCreation?: string
          id?: number
          idAuteur?: number | null
          label?: string
          niveauDifficulte?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_idAuteur_fkey"
            columns: ["idAuteur"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      questionReponse: {
        Row: {
          idQuestion: number
          idReponse: number
          value: boolean
        }
        Insert: {
          idQuestion?: number
          idReponse: number
          value: boolean
        }
        Update: {
          idQuestion?: number
          idReponse?: number
          value?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "questionReponse_idQuestion_fkey"
            columns: ["idQuestion"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionReponse_idReponse_fkey"
            columns: ["idReponse"]
            isOneToOne: false
            referencedRelation: "reponse"
            referencedColumns: ["id"]
          },
        ]
      }
      questionTheme: {
        Row: {
          idQuestion: number
          idTheme: number
        }
        Insert: {
          idQuestion?: number
          idTheme: number
        }
        Update: {
          idQuestion?: number
          idTheme?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionTheme_idQuestion_fkey"
            columns: ["idQuestion"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionTheme_idTheme_fkey"
            columns: ["idTheme"]
            isOneToOne: false
            referencedRelation: "theme"
            referencedColumns: ["id"]
          },
        ]
      }
      quizz: {
        Row: {
          created_at: string
          description: string | null
          id: number
          idAuteur: string | null
          label: string
          niveauDifficulte: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          idAuteur?: string | null
          label: string
          niveauDifficulte?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          idAuteur?: string | null
          label?: string
          niveauDifficulte?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quizzQuestion: {
        Row: {
          idQuestion: number
          idQuizz: number
        }
        Insert: {
          idQuestion?: number
          idQuizz: number
        }
        Update: {
          idQuestion?: number
          idQuizz?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzQuestion_idQuizz_fkey"
            columns: ["idQuizz"]
            isOneToOne: false
            referencedRelation: "quizz"
            referencedColumns: ["id"]
          },
        ]
      }
      reponse: {
        Row: {
          id: number
          label: string
        }
        Insert: {
          id?: number
          label: string
        }
        Update: {
          id?: number
          label?: string
        }
        Relationships: []
      }
      salon: {
        Row: {
          created_at: string
          difficulte: number
          id: number
          label: string | null
          type: Database["public"]["Enums"]["typeRoom"]
        }
        Insert: {
          created_at?: string
          difficulte: number
          id?: number
          label?: string | null
          type: Database["public"]["Enums"]["typeRoom"]
        }
        Update: {
          created_at?: string
          difficulte?: number
          id?: number
          label?: string | null
          type?: Database["public"]["Enums"]["typeRoom"]
        }
        Relationships: []
      }
      theme: {
        Row: {
          id: number
          label: string
        }
        Insert: {
          id?: number
          label: string
        }
        Update: {
          id?: number
          label?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      typeRoom: "normal" | "rapide"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      typeRoom: ["normal", "rapide"],
    },
  },
} as const

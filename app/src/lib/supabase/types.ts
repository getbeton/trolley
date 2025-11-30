/**
 * Database types generated from Supabase schema
 * Run `npx supabase gen types typescript --local` to regenerate
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string | null
          displayName: string | null
          organization: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          email?: string | null
          displayName?: string | null
          organization?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string | null
          displayName?: string | null
          organization?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Credential: {
        Row: {
          id: string
          userId: string | null
          type: Database["public"]["Enums"]["CredentialType"]
          label: string | null
          secret: string
          status: Database["public"]["Enums"]["CredentialStatus"]
          lastValidatedAt: string | null
          validationMessage: string | null
          metadata: Json | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId?: string | null
          type: Database["public"]["Enums"]["CredentialType"]
          label?: string | null
          secret: string
          status?: Database["public"]["Enums"]["CredentialStatus"]
          lastValidatedAt?: string | null
          validationMessage?: string | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string | null
          type?: Database["public"]["Enums"]["CredentialType"]
          label?: string | null
          secret?: string
          status?: Database["public"]["Enums"]["CredentialStatus"]
          lastValidatedAt?: string | null
          validationMessage?: string | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Credential_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      Migration: {
        Row: {
          id: string
          userId: string
          name: string
          description: string | null
          status: Database["public"]["Enums"]["MigrationStatus"]
          sourceSystem: Database["public"]["Enums"]["CrmSystem"]
          targetSystem: Database["public"]["Enums"]["CrmSystem"]
          config: Json | null
          recordEstimate: number | null
          etaSeconds: number | null
          lastRunAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId: string
          name: string
          description?: string | null
          status?: Database["public"]["Enums"]["MigrationStatus"]
          sourceSystem?: Database["public"]["Enums"]["CrmSystem"]
          targetSystem?: Database["public"]["Enums"]["CrmSystem"]
          config?: Json | null
          recordEstimate?: number | null
          etaSeconds?: number | null
          lastRunAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          name?: string
          description?: string | null
          status?: Database["public"]["Enums"]["MigrationStatus"]
          sourceSystem?: Database["public"]["Enums"]["CrmSystem"]
          targetSystem?: Database["public"]["Enums"]["CrmSystem"]
          config?: Json | null
          recordEstimate?: number | null
          etaSeconds?: number | null
          lastRunAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Migration_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      EntitySelection: {
        Row: {
          id: string
          userId: string
          migrationId: string | null
          system: Database["public"]["Enums"]["CrmSystem"]
          entityName: string
          entityLabel: string | null
          status: Database["public"]["Enums"]["SelectionStatus"]
          includeInSync: boolean
          availableFieldCount: number | null
          sampleRecord: Json | null
          metadata: Json | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId: string
          migrationId?: string | null
          system: Database["public"]["Enums"]["CrmSystem"]
          entityName: string
          entityLabel?: string | null
          status?: Database["public"]["Enums"]["SelectionStatus"]
          includeInSync?: boolean
          availableFieldCount?: number | null
          sampleRecord?: Json | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          migrationId?: string | null
          system?: Database["public"]["Enums"]["CrmSystem"]
          entityName?: string
          entityLabel?: string | null
          status?: Database["public"]["Enums"]["SelectionStatus"]
          includeInSync?: boolean
          availableFieldCount?: number | null
          sampleRecord?: Json | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "EntitySelection_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "EntitySelection_migrationId_fkey"
            columns: ["migrationId"]
            isOneToOne: false
            referencedRelation: "Migration"
            referencedColumns: ["id"]
          }
        ]
      }
      FieldSelection: {
        Row: {
          id: string
          entitySelectionId: string
          userId: string
          fieldName: string
          fieldLabel: string | null
          fieldType: string | null
          isRequired: boolean
          isSelected: boolean
          sampleValue: Json | null
          metadata: Json | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          entitySelectionId: string
          userId: string
          fieldName: string
          fieldLabel?: string | null
          fieldType?: string | null
          isRequired?: boolean
          isSelected?: boolean
          sampleValue?: Json | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          entitySelectionId?: string
          userId?: string
          fieldName?: string
          fieldLabel?: string | null
          fieldType?: string | null
          isRequired?: boolean
          isSelected?: boolean
          sampleValue?: Json | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "FieldSelection_entitySelectionId_fkey"
            columns: ["entitySelectionId"]
            isOneToOne: false
            referencedRelation: "EntitySelection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FieldSelection_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      MigrationRun: {
        Row: {
          id: string
          migrationId: string
          status: Database["public"]["Enums"]["RunStatus"]
          progress: number | null
          etaSeconds: number | null
          recordsProcessed: number | null
          batchesProcessed: number | null
          rateLimitHitCount: number | null
          errorMessage: string | null
          startedAt: string
          completedAt: string | null
          metrics: Json | null
        }
        Insert: {
          id?: string
          migrationId: string
          status?: Database["public"]["Enums"]["RunStatus"]
          progress?: number | null
          etaSeconds?: number | null
          recordsProcessed?: number | null
          batchesProcessed?: number | null
          rateLimitHitCount?: number | null
          errorMessage?: string | null
          startedAt?: string
          completedAt?: string | null
          metrics?: Json | null
        }
        Update: {
          id?: string
          migrationId?: string
          status?: Database["public"]["Enums"]["RunStatus"]
          progress?: number | null
          etaSeconds?: number | null
          recordsProcessed?: number | null
          batchesProcessed?: number | null
          rateLimitHitCount?: number | null
          errorMessage?: string | null
          startedAt?: string
          completedAt?: string | null
          metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "MigrationRun_migrationId_fkey"
            columns: ["migrationId"]
            isOneToOne: false
            referencedRelation: "Migration"
            referencedColumns: ["id"]
          }
        ]
      }
      MigrationLog: {
        Row: {
          id: string
          runId: string
          level: Database["public"]["Enums"]["LogLevel"]
          message: string
          context: Json | null
          entityReference: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          runId: string
          level?: Database["public"]["Enums"]["LogLevel"]
          message: string
          context?: Json | null
          entityReference?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          runId?: string
          level?: Database["public"]["Enums"]["LogLevel"]
          message?: string
          context?: Json | null
          entityReference?: string | null
          createdAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "MigrationLog_runId_fkey"
            columns: ["runId"]
            isOneToOne: false
            referencedRelation: "MigrationRun"
            referencedColumns: ["id"]
          }
        ]
      }
      FieldMapping: {
        Row: {
          id: string
          migrationId: string
          sourceFieldId: string
          targetFieldId: string
          transformation: Json | null
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          migrationId: string
          sourceFieldId: string
          targetFieldId: string
          transformation?: Json | null
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          migrationId?: string
          sourceFieldId?: string
          targetFieldId?: string
          transformation?: Json | null
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "FieldMapping_migrationId_fkey"
            columns: ["migrationId"]
            isOneToOne: false
            referencedRelation: "Migration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FieldMapping_sourceFieldId_fkey"
            columns: ["sourceFieldId"]
            isOneToOne: false
            referencedRelation: "FieldSelection"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FieldMapping_targetFieldId_fkey"
            columns: ["targetFieldId"]
            isOneToOne: false
            referencedRelation: "FieldSelection"
            referencedColumns: ["id"]
          }
        ]
      }
      WebhookNotification: {
        Row: {
          id: string
          runId: string
          event: Database["public"]["Enums"]["WebhookEvent"]
          status: Database["public"]["Enums"]["WebhookStatus"]
          targetUrl: string
          payload: Json | null
          responseStatusCode: number | null
          responseBody: string | null
          attemptCount: number
          lastAttemptAt: string | null
          deliveredAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          runId: string
          event: Database["public"]["Enums"]["WebhookEvent"]
          status?: Database["public"]["Enums"]["WebhookStatus"]
          targetUrl: string
          payload?: Json | null
          responseStatusCode?: number | null
          responseBody?: string | null
          attemptCount?: number
          lastAttemptAt?: string | null
          deliveredAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          runId?: string
          event?: Database["public"]["Enums"]["WebhookEvent"]
          status?: Database["public"]["Enums"]["WebhookStatus"]
          targetUrl?: string
          payload?: Json | null
          responseStatusCode?: number | null
          responseBody?: string | null
          attemptCount?: number
          lastAttemptAt?: string | null
          deliveredAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "WebhookNotification_runId_fkey"
            columns: ["runId"]
            isOneToOne: false
            referencedRelation: "MigrationRun"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      CredentialType:
        | "TWENTY_BASE_URL"
        | "TWENTY_API_TOKEN"
        | "TOOL_TOKEN"
        | "ATTIO_API_TOKEN"
        | "NOTIFICATION_WEBHOOK"
      CredentialStatus: "PENDING" | "VALID" | "INVALID" | "ERROR"
      CrmSystem: "TWENTY" | "ATTIO" | "INTERNAL"
      SelectionStatus: "PENDING" | "FETCHING" | "READY" | "ERROR"
      MigrationStatus:
        | "DRAFT"
        | "COLLECTING"
        | "VALIDATING"
        | "READY"
        | "RUNNING"
        | "COMPLETED"
        | "FAILED"
        | "CANCELLED"
      RunStatus: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"
      LogLevel: "DEBUG" | "INFO" | "WARN" | "ERROR"
      WebhookStatus: "PENDING" | "RETRYING" | "DELIVERED" | "FAILED"
      WebhookEvent: "MIGRATION_COMPLETED" | "MIGRATION_FAILED" | "RUN_PROGRESS"
    }
    CompositeTypes: {}
  }
}

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          notification_error: string | null
          notification_sent_at: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          notification_error?: string | null
          notification_sent_at?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          notification_error?: string | null
          notification_sent_at?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          business_email: string | null
          business_phone: string | null
          contact_form_url: string | null
          contact_type: string | null
          created_at: string
          department: string | null
          email_status: string
          id: string
          job_title: string | null
          location: string | null
          name: string | null
          notes: string | null
          preferred: boolean
          profile_url: string | null
          source_url: string | null
          updated_at: string
          vendor_id: string
          verification_status: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          business_email?: string | null
          business_phone?: string | null
          contact_form_url?: string | null
          contact_type?: string | null
          created_at?: string
          department?: string | null
          email_status?: string
          id?: string
          job_title?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          preferred?: boolean
          profile_url?: string | null
          source_url?: string | null
          updated_at?: string
          vendor_id: string
          verification_status?: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          business_email?: string | null
          business_phone?: string | null
          contact_form_url?: string | null
          contact_type?: string | null
          created_at?: string
          department?: string | null
          email_status?: string
          id?: string
          job_title?: string | null
          location?: string | null
          name?: string | null
          notes?: string | null
          preferred?: boolean
          profile_url?: string | null
          source_url?: string | null
          updated_at?: string
          vendor_id?: string
          verification_status?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          dry_run: boolean
          id: string
          inserted_robots: number
          inserted_vendors: number
          skipped: number
          source_name: string
          updated_vendors: number
          warnings: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dry_run: boolean
          id?: string
          inserted_robots?: number
          inserted_vendors?: number
          skipped?: number
          source_name: string
          updated_vendors?: number
          warnings?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dry_run?: boolean
          id?: string
          inserted_robots?: number
          inserted_vendors?: number
          skipped?: number
          source_name?: string
          updated_vendors?: number
          warnings?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          contact_id: string | null
          created_at: string
          direction: string | null
          email_template_id: string | null
          follow_up_date: string | null
          full_notes: string | null
          id: string
          interaction_type: string
          occurred_at: string
          opportunity_id: string
          outcome: string | null
          subject: string | null
          summary: string | null
          team_member_id: string | null
          updated_at: string
          vendor_id: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          direction?: string | null
          email_template_id?: string | null
          follow_up_date?: string | null
          full_notes?: string | null
          id?: string
          interaction_type: string
          occurred_at?: string
          opportunity_id: string
          outcome?: string | null
          subject?: string | null
          summary?: string | null
          team_member_id?: string | null
          updated_at?: string
          vendor_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          direction?: string | null
          email_template_id?: string | null
          follow_up_date?: string | null
          full_notes?: string | null
          id?: string
          interaction_type?: string
          occurred_at?: string
          opportunity_id?: string
          outcome?: string | null
          subject?: string | null
          summary?: string | null
          team_member_id?: string | null
          updated_at?: string
          vendor_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_template_fk"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meetups: {
        Row: {
          attendance_estimate: number | null
          city: string
          country: string
          created_at: string
          description: string | null
          expected_audience: string | null
          id: string
          name: string
          starts_at: string | null
          state: string | null
          status: string
          updated_at: string
          venue: string | null
          workspace_id: string
        }
        Insert: {
          attendance_estimate?: number | null
          city: string
          country: string
          created_at?: string
          description?: string | null
          expected_audience?: string | null
          id?: string
          name: string
          starts_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
          workspace_id: string
        }
        Update: {
          attendance_estimate?: number | null
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          expected_audience?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          board_position: number
          collaborator_ids: string[]
          created_at: string
          id: string
          last_interaction_at: string | null
          meetup_id: string
          next_action: string | null
          next_action_date: string | null
          outcome: string | null
          outreach_summary: string | null
          owner_id: string | null
          priority_score: number | null
          robot_id: string
          stage_id: string | null
          updated_at: string
          vendor_id: string
          workspace_id: string
        }
        Insert: {
          board_position?: number
          collaborator_ids?: string[]
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          meetup_id: string
          next_action?: string | null
          next_action_date?: string | null
          outcome?: string | null
          outreach_summary?: string | null
          owner_id?: string | null
          priority_score?: number | null
          robot_id: string
          stage_id?: string | null
          updated_at?: string
          vendor_id: string
          workspace_id: string
        }
        Update: {
          board_position?: number
          collaborator_ids?: string[]
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          meetup_id?: string
          next_action?: string | null
          next_action_date?: string | null
          outcome?: string | null
          outreach_summary?: string | null
          owner_id?: string | null
          priority_score?: number | null
          robot_id?: string
          stage_id?: string | null
          updated_at?: string
          vendor_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          position: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          ai_confidence: number | null
          ai_rating: number | null
          ai_rationale: string | null
          created_at: string
          criterion_key: string
          effective_rating: number | null
          id: string
          kind: string
          manual_rating: number | null
          manual_rationale: string | null
          needs_review: boolean
          opportunity_id: string | null
          researched_at: string | null
          reviewer_id: string | null
          robot_id: string | null
          source_ids: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_rating?: number | null
          ai_rationale?: string | null
          created_at?: string
          criterion_key: string
          effective_rating?: number | null
          id?: string
          kind: string
          manual_rating?: number | null
          manual_rationale?: string | null
          needs_review?: boolean
          opportunity_id?: string | null
          researched_at?: string | null
          reviewer_id?: string | null
          robot_id?: string | null
          source_ids?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_rating?: number | null
          ai_rationale?: string | null
          created_at?: string
          criterion_key?: string
          effective_rating?: number | null
          id?: string
          kind?: string
          manual_rating?: number | null
          manual_rationale?: string | null
          needs_review?: boolean
          opportunity_id?: string | null
          researched_at?: string | null
          reviewer_id?: string | null
          robot_id?: string | null
          source_ids?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_jobs: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          robot_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
          usage: Json | null
          vendor_id: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          robot_id?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          usage?: Json | null
          vendor_id?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          robot_id?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          usage?: Json | null
          vendor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_jobs_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          accessed_at: string
          citation_metadata: Json | null
          confidence: number | null
          created_at: string
          evidence_summary: string | null
          id: string
          is_official: boolean
          publisher: string | null
          robot_id: string | null
          supported_fields: string[] | null
          title: string | null
          updated_at: string
          url: string
          vendor_id: string | null
          workspace_id: string
        }
        Insert: {
          accessed_at?: string
          citation_metadata?: Json | null
          confidence?: number | null
          created_at?: string
          evidence_summary?: string | null
          id?: string
          is_official?: boolean
          publisher?: string | null
          robot_id?: string | null
          supported_fields?: string[] | null
          title?: string | null
          updated_at?: string
          url: string
          vendor_id?: string | null
          workspace_id: string
        }
        Update: {
          accessed_at?: string
          citation_metadata?: Json | null
          confidence?: number | null
          created_at?: string
          evidence_summary?: string | null
          id?: string
          is_official?: boolean
          publisher?: string | null
          robot_id?: string | null
          supported_fields?: string[] | null
          title?: string | null
          updated_at?: string
          url?: string
          vendor_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_sources_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      robots: {
        Row: {
          commercial_availability: string | null
          created_at: string
          demonstration_capabilities: string | null
          description: string | null
          development_status: string | null
          id: string
          image_urls: string[] | null
          interaction_capabilities: string | null
          last_researched_at: string | null
          manipulation: string | null
          manual_notes: string | null
          mobility: string | null
          name: string
          normalized_name: string
          original_imported_text: string | null
          parsing_review_status: string
          product_url: string | null
          research_status: string
          updated_at: string
          vendor_id: string
          workspace_id: string
        }
        Insert: {
          commercial_availability?: string | null
          created_at?: string
          demonstration_capabilities?: string | null
          description?: string | null
          development_status?: string | null
          id?: string
          image_urls?: string[] | null
          interaction_capabilities?: string | null
          last_researched_at?: string | null
          manipulation?: string | null
          manual_notes?: string | null
          mobility?: string | null
          name: string
          normalized_name: string
          original_imported_text?: string | null
          parsing_review_status?: string
          product_url?: string | null
          research_status?: string
          updated_at?: string
          vendor_id: string
          workspace_id: string
        }
        Update: {
          commercial_availability?: string | null
          created_at?: string
          demonstration_capabilities?: string | null
          description?: string | null
          development_status?: string | null
          id?: string
          image_urls?: string[] | null
          interaction_capabilities?: string | null
          last_researched_at?: string | null
          manipulation?: string | null
          manual_notes?: string | null
          mobility?: string | null
          name?: string
          normalized_name?: string
          original_imported_text?: string | null
          parsing_review_status?: string
          product_url?: string | null
          research_status?: string
          updated_at?: string
          vendor_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "robots_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_criteria: {
        Row: {
          criterion_key: string
          description: string
          id: string
          label: string
          model_id: string
          position: number
          weight: number
          workspace_id: string
        }
        Insert: {
          criterion_key: string
          description: string
          id?: string
          label: string
          model_id: string
          position: number
          weight: number
          workspace_id: string
        }
        Update: {
          criterion_key?: string
          description?: string
          id?: string
          label?: string
          model_id?: string
          position?: number
          weight?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_criteria_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "scoring_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_criteria_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_models: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: string
          version: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: string
          version: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_history: {
        Row: {
          actor_id: string | null
          changed_at: string
          from_stage_id: string | null
          id: string
          opportunity_id: string
          to_stage_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          changed_at?: string
          from_stage_id?: string | null
          id?: string
          opportunity_id: string
          to_stage_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          changed_at?: string
          from_stage_id?: string | null
          id?: string
          opportunity_id?: string
          to_stage_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_locations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_primary: boolean
          iso_country_code: string | null
          location_type: string
          postal_code: string | null
          region: string | null
          source_url: string | null
          updated_at: string
          us_state_code: string | null
          vendor_id: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          iso_country_code?: string | null
          location_type?: string
          postal_code?: string | null
          region?: string | null
          source_url?: string | null
          updated_at?: string
          us_state_code?: string | null
          vendor_id: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          iso_country_code?: string | null
          location_type?: string
          postal_code?: string | null
          region?: string | null
          source_url?: string | null
          updated_at?: string
          us_state_code?: string | null
          vendor_id?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_locations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_locations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_url: string | null
          country: string | null
          created_at: string
          description: string | null
          headquarters_city: string | null
          headquarters_postal_code: string | null
          headquarters_region: string | null
          id: string
          iso_country_code: string | null
          last_researched_at: string | null
          manual_notes: string | null
          name: string
          normalized_name: string
          original_import_data: Json | null
          original_robot_text: string | null
          original_source_name: string | null
          parsing_review_status: string
          product_urls: string[] | null
          public_event_history: string | null
          research_status: string
          source_rank: number | null
          source_row: number | null
          strategic_fit: string | null
          updated_at: string
          us_state_code: string | null
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          contact_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          headquarters_city?: string | null
          headquarters_postal_code?: string | null
          headquarters_region?: string | null
          id?: string
          iso_country_code?: string | null
          last_researched_at?: string | null
          manual_notes?: string | null
          name: string
          normalized_name: string
          original_import_data?: Json | null
          original_robot_text?: string | null
          original_source_name?: string | null
          parsing_review_status?: string
          product_urls?: string[] | null
          public_event_history?: string | null
          research_status?: string
          source_rank?: number | null
          source_row?: number | null
          strategic_fit?: string | null
          updated_at?: string
          us_state_code?: string | null
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          contact_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          headquarters_city?: string | null
          headquarters_postal_code?: string | null
          headquarters_region?: string | null
          id?: string
          iso_country_code?: string | null
          last_researched_at?: string | null
          manual_notes?: string | null
          name?: string
          normalized_name?: string
          original_import_data?: Json | null
          original_robot_text?: string | null
          original_source_name?: string | null
          parsing_review_status?: string
          product_urls?: string[] | null
          public_event_history?: string | null
          research_status?: string
          source_rank?: number | null
          source_row?: number | null
          strategic_fit?: string | null
          updated_at?: string
          us_state_code?: string | null
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          coverage_threshold: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          coverage_threshold?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          coverage_threshold?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_pipeline_stage: {
        Args: { p_stage_id: string; p_direction: number }
        Returns: undefined
      }
      replace_scoring_model: {
        Args: { p_kind: string; p_weights: Json }
        Returns: string
      }
      review_access_request: {
        Args: { p_decision: string; p_request_id: string; p_reviewer: string }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

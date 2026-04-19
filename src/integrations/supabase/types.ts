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
      audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string
          target_type?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      community_channels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          message: string
          store_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          message: string
          store_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          message?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_applied: number
          id: string
          store_id: string
          subscription_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_applied?: number
          id?: string
          store_id: string
          subscription_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          id?: string
          store_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "store_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_orders: {
        Row: {
          admin_notes: string | null
          collection_number: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          id: string
          order_details: string
          order_type: string
          preferred_time: string
          status: string
          store_id: string
          time_slot_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          collection_number?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          id?: string
          order_details: string
          order_type?: string
          preferred_time?: string
          status?: string
          store_id: string
          time_slot_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          collection_number?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          id?: string
          order_details?: string
          order_type?: string
          preferred_time?: string
          status?: string
          store_id?: string
          time_slot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "store_time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          store_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number: string
          store_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          store_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      global_products: {
        Row: {
          brand_name: string
          carton_barcode: string | null
          created_at: string
          id: string
          manufacturer_name: string | null
          packet_barcode: string | null
          packets_per_carton: number | null
          unit_name: string
          updated_at: string
        }
        Insert: {
          brand_name: string
          carton_barcode?: string | null
          created_at?: string
          id?: string
          manufacturer_name?: string | null
          packet_barcode?: string | null
          packets_per_carton?: number | null
          unit_name?: string
          updated_at?: string
        }
        Update: {
          brand_name?: string
          carton_barcode?: string | null
          created_at?: string
          id?: string
          manufacturer_name?: string | null
          packet_barcode?: string | null
          packets_per_carton?: number | null
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          invoice_number: string
          issued_at: string
          payment_method: string
          payment_reference: string | null
          plan_type: string
          status: string
          store_id: string
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          billing_cycle: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          issued_at?: string
          payment_method?: string
          payment_reference?: string | null
          plan_type: string
          status?: string
          store_id: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          payment_method?: string
          payment_reference?: string | null
          plan_type?: string
          status?: string
          store_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "store_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          confirmed_by: string | null
          created_at: string
          id: string
          pdf_generated: boolean | null
          products: Json
          store_id: string
          total_items: number
          week_date: string
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          pdf_generated?: boolean | null
          products?: Json
          store_id: string
          total_items?: number
          week_date: string
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          pdf_generated?: boolean | null
          products?: Json
          store_id?: string
          total_items?: number
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entries: {
        Row: {
          avg_sales_last_three_weeks: number
          back_stock: number
          barcode: string | null
          brand_name: string
          created_at: string
          employee_id: string | null
          front_stock: number
          id: string
          next_week_need: number
          product_id: string | null
          quantity_of_order: number
          store_id: string
          week_date: string
        }
        Insert: {
          avg_sales_last_three_weeks?: number
          back_stock?: number
          barcode?: string | null
          brand_name: string
          created_at?: string
          employee_id?: string | null
          front_stock?: number
          id?: string
          next_week_need?: number
          product_id?: string | null
          quantity_of_order?: number
          store_id: string
          week_date: string
        }
        Update: {
          avg_sales_last_three_weeks?: number
          back_stock?: number
          barcode?: string | null
          brand_name?: string
          created_at?: string
          employee_id?: string | null
          front_stock?: number
          id?: string
          next_week_need?: number
          product_id?: string | null
          quantity_of_order?: number
          store_id?: string
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_customers: {
        Row: {
          address: string | null
          contact_no: string
          created_at: string
          email: string
          id: string
          name: string
          referral_code: string | null
          store_id: string
        }
        Insert: {
          address?: string | null
          contact_no: string
          created_at?: string
          email: string
          id?: string
          name: string
          referral_code?: string | null
          store_id: string
        }
        Update: {
          address?: string | null
          contact_no?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          referral_code?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_order_id: string | null
          store_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_order_id?: string | null
          store_id: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_order_id?: string | null
          store_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_portfolios: {
        Row: {
          global_product_id: string
          id: string
          store_id: string
        }
        Insert: {
          global_product_id: string
          id?: string
          store_id: string
        }
        Update: {
          global_product_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_portfolios_global_product_id_fkey"
            columns: ["global_product_id"]
            isOneToOne: false
            referencedRelation: "global_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_portfolios_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          avg_sales_last_three_weeks: number
          avg_sales_unit: string
          barcode: string | null
          brand_name: string
          carton_barcode: string | null
          created_at: string
          id: string
          manufacturer_name: string | null
          packet_barcode: string | null
          quantity_of_order: number
          store_id: string
          unit_name: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          avg_sales_last_three_weeks?: number
          avg_sales_unit?: string
          barcode?: string | null
          brand_name: string
          carton_barcode?: string | null
          created_at?: string
          id?: string
          manufacturer_name?: string | null
          packet_barcode?: string | null
          quantity_of_order?: number
          store_id: string
          unit_name?: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          avg_sales_last_three_weeks?: number
          avg_sales_unit?: string
          barcode?: string | null
          brand_name?: string
          carton_barcode?: string | null
          created_at?: string
          id?: string
          manufacturer_name?: string | null
          packet_barcode?: string | null
          quantity_of_order?: number
          store_id?: string
          unit_name?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_qr_products: {
        Row: {
          created_at: string
          display_name: string
          display_order: number
          id: string
          is_active: boolean
          store_id: string
          store_product_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          is_active?: boolean
          store_id: string
          store_product_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          is_active?: boolean
          store_id?: string
          store_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_qr_products_store_product_id_fkey"
            columns: ["store_product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          grace_period_ends_at: string | null
          id: string
          last_retry_at: string | null
          pause_days_remaining: number | null
          paused_at: string | null
          payment_mode: string
          paypal_order_id: string | null
          paypal_subscription_id: string | null
          plan_type: string
          resumed_at: string | null
          retry_count: number
          started_at: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_retry_at?: string | null
          pause_days_remaining?: number | null
          paused_at?: string | null
          payment_mode?: string
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          plan_type?: string
          resumed_at?: string | null
          retry_count?: number
          started_at?: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_retry_at?: string | null
          pause_days_remaining?: number | null
          paused_at?: string | null
          payment_mode?: string
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          plan_type?: string
          resumed_at?: string | null
          retry_count?: number
          started_at?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_time_slots: {
        Row: {
          created_at: string
          day_type: string
          id: string
          is_active: boolean
          slot_label: string
          slot_type: string
          store_id: string
        }
        Insert: {
          created_at?: string
          day_type?: string
          id?: string
          is_active?: boolean
          slot_label: string
          slot_type?: string
          store_id: string
        }
        Update: {
          created_at?: string
          day_type?: string
          id?: string
          is_active?: boolean
          slot_label?: string
          slot_type?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_time_slots_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          community_chat_mode: string
          community_enabled: boolean
          community_expires_at: string | null
          community_plan_months: number | null
          contact_no: string
          created_at: string
          delivery_mode: string
          email: string
          id: string
          name: string
          order_data_retention: string
          owner_name: string
          pin_code: string | null
          plan_type: string
          profile_picture_url: string | null
          qr_order_input_mode: string
          qr_service_enabled: boolean
          qr_service_expires_at: string | null
          qr_service_plan_months: number | null
          qr_slug: string
          ref_code_discount: string | null
          show_store_name: boolean
          status: string
          street_address: string | null
          suburb: string | null
          terms_accepted_at: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          unit_suggestion_rules: Json
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          community_chat_mode?: string
          community_enabled?: boolean
          community_expires_at?: string | null
          community_plan_months?: number | null
          contact_no?: string
          created_at?: string
          delivery_mode?: string
          email: string
          id: string
          name: string
          order_data_retention?: string
          owner_name?: string
          pin_code?: string | null
          plan_type?: string
          profile_picture_url?: string | null
          qr_order_input_mode?: string
          qr_service_enabled?: boolean
          qr_service_expires_at?: string | null
          qr_service_plan_months?: number | null
          qr_slug?: string
          ref_code_discount?: string | null
          show_store_name?: boolean
          status?: string
          street_address?: string | null
          suburb?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          unit_suggestion_rules?: Json
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          community_chat_mode?: string
          community_enabled?: boolean
          community_expires_at?: string | null
          community_plan_months?: number | null
          contact_no?: string
          created_at?: string
          delivery_mode?: string
          email?: string
          id?: string
          name?: string
          order_data_retention?: string
          owner_name?: string
          pin_code?: string | null
          plan_type?: string
          profile_picture_url?: string | null
          qr_order_input_mode?: string
          qr_service_enabled?: boolean
          qr_service_expires_at?: string | null
          qr_service_plan_months?: number | null
          qr_slug?: string
          ref_code_discount?: string | null
          show_store_name?: boolean
          status?: string
          street_address?: string | null
          suburb?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          unit_suggestion_rules?: Json
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          store_email: string
          store_id: string
          store_name: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          store_email?: string
          store_id: string
          store_name?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          store_email?: string
          store_id?: string
          store_name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          source: string
          status: string
          store_id: string | null
          subscription_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          source?: string
          status?: string
          store_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          source?: string
          status?: string
          store_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "store_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_store_duplicate: {
        Args: { _contact_no: string; _email: string }
        Returns: {
          contact_taken: boolean
          email_taken: boolean
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_store_id: { Args: never; Returns: string }
      get_active_time_slots_for_store: {
        Args: { _store_id: string }
        Returns: {
          day_type: string
          id: string
          slot_label: string
          slot_type: string
        }[]
      }
      get_order_by_collection_number: {
        Args: { _collection_number: string; _store_id: string }
        Returns: {
          admin_notes: string | null
          collection_number: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          id: string
          order_details: string
          order_type: string
          preferred_time: string
          status: string
          store_id: string
          time_slot_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_order_status_by_id: {
        Args: { _order_id: string }
        Returns: {
          collection_number: string
          status: string
        }[]
      }
      get_public_store_by_slug: {
        Args: { _slug: string }
        Returns: {
          delivery_mode: string
          id: string
          name: string
          qr_order_input_mode: string
          qr_service_enabled: boolean
          qr_service_expires_at: string
          show_store_name: boolean
          status: string
        }[]
      }
      get_qr_products_for_store: {
        Args: { _store_id: string }
        Returns: {
          display_name: string
          display_order: number
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_store: { Args: { _store_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_store_customer: {
        Args: { _contact_no: string; _name: string; _store_id: string }
        Returns: {
          contact_no: string
          email: string
          id: string
          name: string
        }[]
      }
      verify_customer_otp: {
        Args: { _code: string; _email: string; _store_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "store_owner"
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
      app_role: ["admin", "store_owner"],
    },
  },
} as const

/**
 * Shared types mirroring the PostgreSQL schema (snake_case column names).
 * Optional relation fields (e.g. `patients?` on MealRequest) use the table
 * name as the key to match the json_build_object alias from the SQL queries.
 */

export interface Patient {
  id: string;
  name: string;
  room_number: string | null;
  diet_order: string;
  allergies: string[];
  clinical_state: string;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  allergens: string[];
  diet_tags: string[];
  created_at: string;
}

export interface MealRequest {
  id: string;
  patient_id: string;
  status: 'Draft' | 'Validated' | 'Rejected' | 'Finalized';
  rejection_reason: string | null;
  finalized_at: string | null;
  created_at: string;
  patients?: Patient;
}

export interface RequestItem {
  id: string;
  request_id: string;
  recipe_id: string;
  quantity: number;
  recipes?: Recipe;
}

export interface Tray {
  id: string;
  request_id: string;
  status: 'Preparation Started' | 'Accuracy Validated' | 'En Route' | 'Delivered' | 'Retrieved';
  preparation_started_at: string | null;
  accuracy_validated_at: string | null;
  en_route_at: string | null;
  delivered_at: string | null;
  retrieved_at: string | null;
  created_at: string;
  meal_requests?: MealRequest & { patients?: Patient };
}

export const TRAY_STATUSES = [
  'Preparation Started',
  'Accuracy Validated',
  'En Route',
  'Delivered',
  'Retrieved',
] as const;

export const DIET_OPTIONS = [
  'Regular',
  'Low Sodium',
  'Diabetic',
  'Vegetarian',
  'Renal',
  'Pureed',
  'Liquid',
] as const;

export const CLINICAL_STATE_OPTIONS = [
  'Stable',
  'Critical',
  'Observation',
  'Post-Op',
  'Discharge Pending',
  'NPO',
] as const;

export const ALLERGY_OPTIONS = [
  'Shellfish',
  'Gluten',
  'Dairy',
  'Peanuts',
  'Tree Nuts',
  'Soy',
  'Eggs',
  'Fish',
] as const;

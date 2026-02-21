CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  diet_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_number TEXT,
  diet_order TEXT NOT NULL DEFAULT 'Regular',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  clinical_state TEXT NOT NULL DEFAULT 'Stable' CHECK (clinical_state IN ('Stable', 'Critical', 'Observation', 'Post-Op', 'Discharge Pending', 'NPO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE meal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Validated', 'Rejected', 'Finalized')),
  rejection_reason TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES meal_requests(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  quantity INT NOT NULL DEFAULT 1
);

CREATE TABLE trays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE REFERENCES meal_requests(id),
  status TEXT NOT NULL DEFAULT 'Preparation Started' CHECK (status IN ('Preparation Started', 'Accuracy Validated', 'En Route', 'Delivered', 'Retrieved')),
  preparation_started_at TIMESTAMPTZ DEFAULT now(),
  accuracy_validated_at TIMESTAMPTZ,
  en_route_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO recipes (name, description, allergens, diet_tags) VALUES
  ('Grilled Chicken Breast', 'Herb-seasoned grilled chicken with steamed vegetables', '{}', '{"Regular","Low Sodium","Diabetic"}'),
  ('Shrimp Scampi', 'Garlic butter shrimp over linguine', '{"Shellfish"}', '{"Regular"}'),
  ('Caesar Salad', 'Romaine lettuce with caesar dressing and croutons', '{"Gluten","Dairy"}', '{"Regular","Low Sodium"}'),
  ('Steamed Rice Bowl', 'White rice with steamed broccoli and tofu', '{"Soy"}', '{"Regular","Low Sodium","Diabetic","Vegetarian"}'),
  ('Turkey Sandwich', 'Sliced turkey on whole wheat with lettuce and tomato', '{"Gluten"}', '{"Regular","Low Sodium"}'),
  ('Fruit Cup', 'Seasonal mixed fresh fruits', '{}', '{"Regular","Low Sodium","Diabetic","Vegetarian"}'),
  ('Cream of Mushroom Soup', 'Rich creamy mushroom soup', '{"Dairy"}', '{"Regular","Vegetarian"}'),
  ('Baked Salmon', 'Oven-baked salmon fillet with lemon dill sauce', '{"Fish"}', '{"Regular","Low Sodium","Diabetic"}'),
  ('Peanut Butter Toast', 'Whole wheat toast with creamy peanut butter', '{"Gluten","Peanuts"}', '{"Regular","Vegetarian"}'),
  ('Chicken Noodle Soup', 'Classic chicken noodle soup', '{"Gluten"}', '{"Regular","Low Sodium"}');


-- Recipes: master list of available meal items
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  diet_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients: clinical source of truth
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_number TEXT,
  diet_order TEXT NOT NULL DEFAULT 'Regular',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged')),
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meal Requests
CREATE TABLE public.meal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Validated', 'Rejected', 'Finalized')),
  rejection_reason TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Request Items (many-to-many between requests and recipes)
CREATE TABLE public.request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.meal_requests(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id),
  quantity INT NOT NULL DEFAULT 1
);

-- Trays: 1:1 with finalized requests
CREATE TABLE public.trays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE REFERENCES public.meal_requests(id),
  status TEXT NOT NULL DEFAULT 'Preparation Started' CHECK (status IN ('Preparation Started', 'Accuracy Validated', 'En Route', 'Delivered', 'Retrieved')),
  preparation_started_at TIMESTAMPTZ DEFAULT now(),
  accuracy_validated_at TIMESTAMPTZ,
  en_route_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trays ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for this clinical workflow app)
CREATE POLICY "Allow all on recipes" ON public.recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on meal_requests" ON public.meal_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on request_items" ON public.request_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on trays" ON public.trays FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger for patients
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some recipes
INSERT INTO public.recipes (name, description, allergens, diet_tags) VALUES
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

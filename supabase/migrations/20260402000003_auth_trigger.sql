-- ============================================================
-- HubSolutions — Auth trigger
-- Migration 3: Cria linha em public.users ao criar auth user
-- ============================================================

-- Função chamada pelo trigger em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_full_name  text;
  v_role       text;
  v_company_id uuid;
BEGIN
  v_full_name  := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_role       := COALESCE(NEW.raw_user_meta_data->>'role', 'superadmin');
  v_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::uuid;

  -- Superadmin nunca tem company
  IF v_role = 'superadmin' THEN
    v_company_id := NULL;
  END IF;

  INSERT INTO public.users (supabase_user_id, full_name, email, role, company_id)
  VALUES (NEW.id, v_full_name, NEW.email, v_role, v_company_id)
  ON CONFLICT (supabase_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

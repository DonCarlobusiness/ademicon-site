-- Estado transitorio do onboarding (pin e cultura entre duas mensagens).
--
-- Antes isto vivia num Map em memoria do processo: reiniciar o app no meio
-- do cadastro perdia o pin do produtor, e com mais de uma instancia a
-- segunda mensagem caia num processo que nao tinha o estado.
ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS onboarding_data jsonb NOT NULL DEFAULT '{}'::jsonb;

import { useTranslation } from 'react-i18next';

type Named = { name: string; namePt: string | null };

export function useExerciseName() {
  const { i18n } = useTranslation();
  return (e: Named) => (i18n.language === 'pt-BR' && e.namePt ? e.namePt : e.name);
}

/**
 * Punto único de i18n: los componentes importan `{ t }` desde aquí.
 * `t` es un binding vivo que `setI18nLang` intercambia entre es/en;
 * la UI se renombra al cambiar porque App remonta el árbol con key={lang}.
 */
import { t as es } from './es';
import { en } from './en';

export type Lang = 'es' | 'en';
export type { Strings } from './es';
export { APP_VERSION } from './es';

export let t = es;

export function setI18nLang(lang: Lang): void {
  t = lang === 'en' ? en : es;
}

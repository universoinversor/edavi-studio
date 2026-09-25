const KEY = 'edavi.theme';

// Se ejecuta en <head> antes de pintar para evitar el parpadeo de tema.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

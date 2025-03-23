export type Theme = 'light' | 'dark';

export const setTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
};

export const getTheme = (): Theme => {
    return (localStorage.getItem('theme') as Theme) || 'light';
};

export const initTheme = () => {
    const savedTheme = getTheme();
    setTheme(savedTheme);
};

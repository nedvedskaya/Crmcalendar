import { useState, useEffect } from 'react';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

interface LoginScreenProps {
  onLogin: (userData: { id: number; name: string; email: string; role: string; isOwner: boolean; firstName?: string; lastName?: string; avatar?: string }, token?: string) => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const savedEmail = localStorage.getItem('ugt_saved_email');
    const savedRememberMe = localStorage.getItem('ugt_remember_me');
    if (savedEmail) setEmail(savedEmail);
    if (savedRememberMe !== null) setRememberMe(savedRememberMe === 'true');
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!email.trim()) {
      setError('Введите email');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Введите корректный email');
      return;
    }
    
    if (!password) {
      setError('Введите пароль');
      return;
    }
    
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Произошла ошибка');
        setIsLoading(false);
        return;
      }
      
      if (data.success && data.user) {
        if (rememberMe) {
          localStorage.setItem('ugt_saved_email', email);
          localStorage.setItem('ugt_remember_me', 'true');
        } else {
          localStorage.removeItem('ugt_saved_email');
          localStorage.setItem('ugt_remember_me', 'false');
        }
        onLogin({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          isOwner: data.user.isOwner,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          avatar: data.user.avatar
        }, data.token);
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight mb-1">
              UGT TUNERS
            </h1>
            <p className="text-sm text-zinc-500">
              Войдите в систему
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="Email"
                className={`w-full bg-zinc-50 border ${
                  focusedField === 'email' ? 'border-zinc-900 bg-white' : error && !email ? 'border-red-400' : 'border-zinc-200'
                } rounded-xl px-4 py-3.5 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="Пароль"
                className={`w-full bg-zinc-50 border ${
                  focusedField === 'password' ? 'border-zinc-900 bg-white' : 'border-zinc-200'
                } rounded-xl px-4 py-3.5 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition-all`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 px-1">
                {error}
              </p>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 cursor-pointer"
              />
              <span className="text-sm text-zinc-600">Запомнить меня</span>
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`w-full bg-zinc-900 text-white text-base font-medium py-3.5 rounded-xl transition-all ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-zinc-800 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Вход...
              </span>
            ) : (
              'Войти'
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Доступ только для авторизованных пользователей
        </p>
      </div>
    </div>
  );
};

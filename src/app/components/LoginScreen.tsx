import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (userData: { id: number; name: string; email: string; role: string; isOwner: boolean }) => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    
    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const body = isRegistering 
        ? { email, password, name: name || email.split('@')[0] }
        : { email, password };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Произошла ошибка');
        setIsLoading(false);
        return;
      }
      
      if (data.success && data.user) {
        onLogin({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          isOwner: data.user.isOwner
        });
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

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-black tracking-tight mb-2">
            UGT TUNERS
          </h1>
          <p className="text-base text-zinc-400">
            {isRegistering ? 'Создайте аккаунт' : 'Войдите в систему'}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {isRegistering && (
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Имя (необязательно)"
                className={`w-full bg-white border ${
                  focusedField === 'name' ? 'border-orange-500' : 'border-zinc-200'
                } rounded-xl px-4 py-4 text-base text-black placeholder:text-zinc-400 outline-none transition-all`}
              />
            </div>
          )}

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
              className={`w-full bg-white border ${
                focusedField === 'email' ? 'border-orange-500' : error && !email ? 'border-red-500' : 'border-zinc-200'
              } rounded-xl px-4 py-4 text-base text-black placeholder:text-zinc-400 outline-none transition-all`}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="Пароль"
              className={`w-full bg-white border ${
                focusedField === 'password' ? 'border-orange-500' : 'border-zinc-200'
              } rounded-xl px-4 py-4 text-base text-black placeholder:text-zinc-400 outline-none transition-all`}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegistering && (
            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                placeholder="Подтвердите пароль"
                className={`w-full bg-white border ${
                  focusedField === 'confirmPassword' ? 'border-orange-500' : 'border-zinc-200'
                } rounded-xl px-4 py-4 text-base text-black placeholder:text-zinc-400 outline-none transition-all`}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 px-4">
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full bg-orange-500 text-white text-base font-semibold py-4 rounded-xl transition-all active:scale-[0.98] ${
            isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isRegistering ? 'Регистрация...' : 'Вход...'}
            </span>
          ) : (
            isRegistering ? 'Зарегистрироваться' : 'Войти'
          )}
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-zinc-500 hover:text-orange-500 transition-colors"
          >
            {isRegistering ? (
              <>Уже есть аккаунт? <span className="text-orange-500 font-medium">Войти</span></>
            ) : (
              <>Нет аккаунта? <span className="text-orange-500 font-medium">Зарегистрироваться</span></>
            )}
          </button>
        </div>

        {!isRegistering && (
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-400">
              Минимум 6 символов для пароля
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

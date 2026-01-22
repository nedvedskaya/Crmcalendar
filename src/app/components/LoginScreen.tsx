import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (userData: { name: string; role: string }) => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = () => {
    if (!name.trim()) {
      setError('Введите имя');
      return;
    }

    if (password === 'owner' || password === 'собственник') {
      onLogin({ name: name.trim(), role: 'owner' });
    } else {
      setError('Неверный пароль');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Минималистичный логотип */}
        <div className="text-center mb-16">
          <h1 className="text-3xl font-semibold text-black tracking-tight mb-2">
            UGT TUNERS
          </h1>
          <p className="text-base text-zinc-400">
            Войдите в систему
          </p>
        </div>

        {/* Чистая форма */}
        <div className="space-y-4 mb-6">
          {/* Имя */}
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
              placeholder="Логин"
              className={`w-full bg-white border ${
                focusedField === 'name' ? 'border-orange-500' : error && !name ? 'border-red-500' : 'border-zinc-200'
              } rounded-xl px-4 py-4 text-base text-black placeholder:text-zinc-400 outline-none transition-all`}
              autoFocus
            />
          </div>

          {/* Пароль */}
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
                focusedField === 'password' ? 'border-orange-500' : error && password !== 'owner' ? 'border-red-500' : 'border-zinc-200'
              } rounded-xl px-4 py-4 text-base text-black placeholder:text-zinc-400 outline-none transition-all`}
            />
          </div>

          {/* Ошибка - минималистично */}
          {error && (
            <p className="text-sm text-red-500 px-4">
              {error}
            </p>
          )}
        </div>

        {/* Единственная кнопка - акцент */}
        <button
          onClick={handleLogin}
          className="w-full bg-orange-500 text-white text-base font-semibold py-4 rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
        >
          Войти
        </button>

        {/* Подсказка - ненавязчиво */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-400">
            Используйте пароль <span className="text-zinc-600 font-medium">owner</span>
          </p>
        </div>
      </div>
    </div>
  );
};
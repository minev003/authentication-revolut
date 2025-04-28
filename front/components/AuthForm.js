'use client';

import { useState } from 'react';

export default function AuthForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = { email, firstName, lastName, birthDate, address, password, };

    if (isSignUp && password !== confirmPassword) {
      alert('Паролите не съвпадат');
      return;
    }

    onSubmit(formData, isSignUp);
  };

  return (
    <div className="container d-flex justify-content-center mt-5">
      <div className="card shadow-sm p-4" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-center mb-4">{isSignUp ? 'Регистрация' : 'Вход'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Имейл</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {isSignUp && (
            <>
              <div className="mb-3">
                <label htmlFor="firstName" className="form-label">Име</label>
                <input
                  type="text"
                  id="firstName"
                  className="form-control"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="lastName" className="form-label">Фамилия</label>
                <input
                  type="text"
                  id="lastName"
                  className="form-control"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>


              <div className="mb-3">
                <label htmlFor="birthDate" className="form-label">Дата на раждане</label>
                <input
                  type="date"
                  id="birthDate"
                  className="form-control"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="address" className="form-label">Адрес</label>
                <input
                  type="text"
                  id="address"
                  className="form-control"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="mb-3">
            <label htmlFor="password" className="form-label">Парола</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isSignUp && (
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Потвърдете паролата</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-primary">
              {isSignUp ? 'Регистрирай се' : 'Влез'}
            </button>
          </div>
        </form>

        <div className="text-center mt-3">
          <button
            className="btn btn-link p-0"
            onClick={() => setIsSignUp((prev) => !prev)}
          >
            {isSignUp ? 'Имате ли вече акаунт? Влезте тук' : 'Нямате акаунт? Регистрирайте се тук'}
          </button>
        </div>
      </div>
    </div>
  );
}
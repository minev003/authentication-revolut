'use client';

import { useState } from 'react';
import AuthForm from '../../components/AuthForm'; // пътя зависи от структурата на проекта
import { PrismaClient } from '@prisma/client';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Статус за успешен вход/регистрация
  const [image, setImage] = useState(null); // За съхранение на изображението на личната карта
  const [selfie, setSelfie] = useState(null); // За съхранение на селфи снимката

  const handleFormSubmit = async (formData, isSignUp) => {

    const formDataWithSignUp = { ...formData, isSignUp };



    const url = '/api/auth';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formDataWithSignUp),

    });
    console.log(formData);

    const data = await res.json();

    if (res.ok) {
      setMessage(isSignUp ? 'Регистрацията е успешна!' : 'Влезли сте успешно!');
      setIsAuthenticated(true); // Ако е успешен вход/регистрация
    } else {
      setMessage(data.error || 'Грешка при изпълнение');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file)); // Преобразуваме файл в URL, за да го покажем в браузъра
    }
  };

  const handleSelfieChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfie(URL.createObjectURL(file)); // Преобразуваме файл в URL за селфи
    }
  };

  const handleSubmitVerification = (e) => {
    e.preventDefault();
    if (!image) {
      alert('Моля, качете снимка на личната карта!');
      return;
    }
    if (!selfie) {
      alert('Моля, качете селфи!');
      return;
    }

    // Тук ще добавим логика за изпращане на изображенията към сървъра или за сравнение
    alert('Снимката на личната карта и селфито са качени успешно!');
  };

  return (
    <div className="bg-dark text-light min-vh-100 d-flex flex-column align-items-center justify-content-center p-4">
      <h1 className="text-center mt-4 mb-5">{message || 'Моля, влезте или се регистрирайте'}</h1>

      {/* Ако потребителят е успешно влязъл или се е регистрирал, показваме формата за верификация */}
      {isAuthenticated ? (
        <div className="container d-flex justify-content-center mt-5">
          <div className="card shadow-lg p-4 bg-opacity-90" style={{ width: '100%', maxWidth: '450px', borderRadius: '15px' }}>
            <h2 className="text-center mb-4 text-primary">Верификация на лична карта</h2>

            <form onSubmit={handleSubmitVerification}>
              <div className="mb-3">
                <label htmlFor="idCardImage" className="form-label">Качете снимка на личната карта или паспорт</label>
                <input
                  type="file"
                  id="idCardImage"
                  className="form-control-file border-0 shadow-sm"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                />
              </div>

              {/* Показваме преглед на снимката на личната карта, ако е качена */}
              {image && (
                <div className="mb-3">
                  <img src={image} alt="ID Card Preview" className="img-fluid rounded-3 shadow-sm" />
                </div>
              )}

              {/* Секция за качване на селфи */}
              <div className="mb-3">
                <label htmlFor="selfie" className="form-label">Качете селфи за сравнение</label>
                <input
                  type="file"
                  id="selfie"
                  className="form-control-file border-0 shadow-sm"
                  accept="image/*"
                  onChange={handleSelfieChange}
                  required
                />
              </div>

              {/* Показваме преглед на селфито, ако е качено */}
              {selfie && (
                <div className="mb-3">
                  <img src={selfie} alt="Selfie Preview" className="img-fluid rounded-3 shadow-sm" />
                </div>
              )}

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary btn-lg">Потвърдете верификацията</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <AuthForm onSubmit={handleFormSubmit} />
      )}
    </div>
  );
}
``

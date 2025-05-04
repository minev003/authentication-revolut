'use client';
// 1. Импортираме нужните неща от React и Next.js
import { useRef, useState, useEffect } from 'react'; // Добавен useEffect за почистване
import { useRouter } from 'next/navigation'; // <-- ДОБАВЕНО: Импорт на useRouter
import AuthForm from '../../components/AuthForm';

const timeoutDuration = 60000;

export default function LoginPage() {
  // 2. Инициализираме рутера
  const router = useRouter(); // <-- ДОБАВЕНО: Инициализация на useRouter

  // --- Състояния (State) ---
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [documentType, setDocumentType] = useState('ID Card');
  const [docFrontFile, setDocFrontFile] = useState(null);
  const [docFrontPreview, setDocFrontPreview] = useState(null);
  const [docBackFile, setDocBackFile] = useState(null);
  const [docBackPreview, setDocBackPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorField, setErrorField] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Референции към input полета ---
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  // --- Функции за обработка ---

  const handleFileCapture = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Моля, изберете файл с изображение.');
      setErrorField(type);
      if (e.target) e.target.value = null;
      return;
    }

    const url = URL.createObjectURL(file);

    // Освобождаваме стария URL преди да зададем новия, за да пестим памет
    if (type === 'front' && docFrontPreview) URL.revokeObjectURL(docFrontPreview);
    if (type === 'back' && docBackPreview) URL.revokeObjectURL(docBackPreview);
    if (type === 'selfie' && selfiePreview) URL.revokeObjectURL(selfiePreview);


    if (errorField === type || errorField === 'general' || errorField === 'network') {
      setErrorField(null);
      setErrorMessage('');
    }
    if (type === 'front') {
      setDocFrontFile(file);
      setDocFrontPreview(url);
    } else if (type === 'back') {
      setDocBackFile(file);
      setDocBackPreview(url);
    } else {
      setSelfieFile(file);
      setSelfiePreview(url);
    }
  };

  // Почистване на Object URLs при размонтиране на компонента
  useEffect(() => {
    return () => {
      if (docFrontPreview) URL.revokeObjectURL(docFrontPreview);
      if (docBackPreview) URL.revokeObjectURL(docBackPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [docFrontPreview, docBackPreview, selfiePreview]); // Зависимостите


  const handleAuthSubmit = async (formData, isSignUp) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isSignUp }),
      });
      const text = await res.text();
      if (res.ok) {
        setIsAuthenticated(true);
        setMessage('');
      } else {
        try {
          setMessage(JSON.parse(text).error || 'Execution error');
        } catch {
          setMessage('Execution error on response.');
        }
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Auth request failed:", err);
      setMessage('Error executing the request');
      setIsAuthenticated(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setErrorField(null);
    setErrorMessage('');

    if (!docFrontFile || !docBackFile || !selfieFile) {
      setErrorField('general');
      setErrorMessage('Моля, направете снимки на предна и задна част на документа и селфи!');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('idCardFront', docFrontFile, docFrontFile.name || 'idCardFront.jpg');
    formData.append('idCardBack', docBackFile, docBackFile.name || 'idCardBack.jpg');
    formData.append('selfie', selfieFile, selfieFile.name || 'selfie.jpg');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`Request timed out after ${timeoutDuration / 1000} seconds.`);
      controller.abort();
    }, timeoutDuration);

    try {
      console.log("Sending verification request...");
      const response = await fetch('/verify', { // Проверете дали URL е коректен
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`Received response status: ${response.status}`);

      let responseData;
      try {
        responseData = await response.json();
        console.log("Parsed response data:", responseData);
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        setErrorField('network');
        setErrorMessage(`Грешка при обработка на отговора (${response.status}).`);
        setIsLoading(false); // Спираме зареждането при грешка в JSON
        return;
      }

      if (response.ok && responseData.status === 'success' && responseData.verified === true) {
        console.log('Verification succeeded:', responseData);
        // alert('Верификацията е успешна!'); // По желание може да се махне

        // Нулиране на формата (опционално, тъй като ще има пренасочване)
        // setDocFrontFile(null); setDocFrontPreview(null);
        // setDocBackFile(null); setDocBackPreview(null);
        // setSelfieFile(null); setSelfiePreview(null);
        // setErrorField(null); setErrorMessage('');

        // 3. Пренасочваме към началната страница
        router.push('/homePage'); // <-- ДОБАВЕНО: Пренасочване. ЗАМЕНЕТЕ '/homePage' С ВАШИЯ ПЪТ!

      } else {
        // Обработка на неуспешна верификация
        const message = responseData?.message || `Грешка при верификация (${response.status}).`;
        const field = responseData?.field;
        const code = responseData?.code;

        console.error(`Verification failed by backend. Code: ${code}, Field: ${field}, Message: ${message}`);
        setErrorMessage(message);

        if (field === 'idCardFront') {
          setErrorField('front');
        } else if (field === 'selfie') {
          setErrorField('selfie');
        } else {
          setErrorField('general');
        }
        setIsLoading(false); // Спираме зареждането при неуспех
      }

    } catch (error) {
      // Обработка на мрежови и други грешки
      console.error('Verification fetch request failed:', error);
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        setErrorField('network');
        setErrorMessage(`Заявката отне твърде дълго време (> ${timeoutDuration / 1000} сек) и беше прекратена.`);
      } else {
        setErrorField('network');
        setErrorMessage('Не може да се осъществи връзка със сървъра.');
      }
      setIsLoading(false); // Спираме зареждането при грешка
    }
    // Блокът finally е премахнат, за да се гарантира, че setIsLoading(false) не се извиква
    // преди успешното пренасочване. Той вече е добавен в catch и else блоковете.
  };

  // --- JSX (Визуална част) ---
  return (
    <div className="bg-dark text-light min-vh-100 d-flex flex-column align-items-center justify-content-center p-4">
      {/* Loading overlay */}
      {isLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000
          }}
        >
          <div className="spinner-border text-light mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-light">Верификацията се обработва, моля изчакайте...</p>
          <p className="text-light small">(Това може да отнеме до {Math.ceil(timeoutDuration / 1000 / 60)} минути)</p>
        </div>
      )}

      <h1 className="text-center mt-4 mb-5">{message || (isAuthenticated ? 'Верификация на документ' : 'Автентикация')}</h1>

      {!isAuthenticated ? (
        <AuthForm onSubmit={handleAuthSubmit} />
      ) : !selectedCountry ? (
        <div className="card shadow-lg p-4 bg-opacity-90" style={{ maxWidth: 450, width: '100%', borderRadius: '15px' }}>
          <h3 className="mb-3 text-center">Избери държава</h3>
          <select className="form-select mb-4" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
            <option value="">-- Избери --</option>
            <option value="Bulgaria">България</option>
            <option value="Romania">Румъния</option>
            <option value="Germany">Германия</option>
            <option value="France">Франция</option>
            <option value="Italy">Италия</option>
          </select>
          {!selectedCountry && <p className="text-warning small text-center">Моля, изберете държава.</p>}
        </div>
      ) : (
        <div className="container d-flex justify-content-center mt-3">
          <div className="card shadow-lg p-4 bg-opacity-90" style={{ maxWidth: 500, width: '100%', borderRadius: '15px' }}>
            <form onSubmit={handleVerificationSubmit}>
              {/* Document Type */}
              <div className="mb-3">
                <label className="form-label">Тип документ</label>
                <select className="form-select mb-4" value={documentType} onChange={e => setDocumentType(e.target.value)}>
                  <option value="ID Card">Лична карта</option>
                  <option value="Passport">Паспорт</option>
                </select>
              </div>

              {/* Document Front Input */}
              <div className="mb-4">
                <label className="form-label d-block">Лице на документа</label>
                {!docFrontPreview ? (
                  <button type="button" className={`btn ${errorField === 'front' ? 'btn-outline-danger' : 'btn-outline-secondary'} d-block mb-2 w-100`} onClick={() => frontInputRef.current?.click()}>
                    Снимай лице
                  </button>
                ) : (
                  <div className="text-center mb-2">
                    <img src={docFrontPreview} alt="Front Preview" className="img-fluid rounded-3 mb-2" />
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setDocFrontFile(null); setDocFrontPreview(null); if (frontInputRef.current) frontInputRef.current.value = null; frontInputRef.current?.click(); }}>
                      Промени
                    </button>
                  </div>
                )}
                <input ref={frontInputRef} type="file" accept="image/*" capture="environment" onChange={e => handleFileCapture(e, 'front')} style={{ display: 'none' }} />
                {errorField === 'front' && <div className="text-danger small mt-1">{errorMessage}</div>}
              </div>

              {/* Document Back Input */}
              <div className="mb-4">
                <label className="form-label d-block">Гръб на документа</label>
                {!docBackPreview ? (
                  <button type="button" className={`btn ${errorField === 'back' ? 'btn-outline-danger' : 'btn-outline-secondary'} d-block mb-2 w-100`} onClick={() => backInputRef.current?.click()}>
                    Снимай гръб
                  </button>
                ) : (
                  <div className="text-center mb-2">
                    <img src={docBackPreview} alt="Back Preview" className="img-fluid rounded-3 mb-2" />
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setDocBackFile(null); setDocBackPreview(null); if (backInputRef.current) backInputRef.current.value = null; backInputRef.current?.click(); }}>
                      Промени
                    </button>
                  </div>
                )}
                <input ref={backInputRef} type="file" accept="image/*" capture="environment" onChange={e => handleFileCapture(e, 'back')} style={{ display: 'none' }} />
                {errorField === 'back' && <div className="text-danger small mt-1">{errorMessage}</div>}
              </div>

              {/* Selfie Input */}
              <div className="mb-4">
                <label className="form-label d-block">Селфи</label>
                {!selfiePreview ? (
                  <button type="button" className={`btn ${errorField === 'selfie' ? 'btn-outline-danger' : 'btn-outline-secondary'} d-block mb-2 w-100`} onClick={() => selfieInputRef.current?.click()}>
                    Направи селфи
                  </button>
                ) : (
                  <div className="text-center mb-2">
                    <img src={selfiePreview} alt="Selfie Preview" className="img-fluid rounded-3 mb-2" />
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setSelfieFile(null); setSelfiePreview(null); if (selfieInputRef.current) selfieInputRef.current.value = null; selfieInputRef.current?.click(); }}>
                      Направи ново
                    </button>
                  </div>
                )}
                <input ref={selfieInputRef} type="file" accept="image/*" capture="user" onChange={e => handleFileCapture(e, 'selfie')} style={{ display: 'none' }} />
                {errorField === 'selfie' && <div className="text-danger small mt-1">{errorMessage}</div>}
              </div>

              {/* General/Network Error Display Area */}
              {(errorField === 'general' || errorField === 'network') && (
                <div className="alert alert-danger text-center small p-2" role="alert">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary btn-lg w-100" disabled={isLoading || !docFrontFile || !docBackFile || !selfieFile}>
                {isLoading ? 'Обработка...' : 'Потвърди верификацията'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
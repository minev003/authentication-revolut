'use client';
import { useRef, useState } from 'react';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');

  // Тип документ
  const [documentType, setDocumentType] = useState('ID Card');
  // Снимки като File + Preview URL
  const [docFrontFile, setDocFrontFile] = useState(null);
  const [docFrontPreview, setDocFrontPreview] = useState(null);
  const [docBackFile, setDocBackFile] = useState(null);
  const [docBackPreview, setDocBackPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  // refs за невидимите <input>
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  // loading и грешка
  const [isLoading, setIsLoading] = useState(false);
  const [errorField, setErrorField] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileCapture = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // reset error state for this field
    if (errorField === type) {
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

  const handleAuthSubmit = async (formData, isSignUp) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isSignUp }),
      });
      const text = await res.text();
      if (res.ok) setIsAuthenticated(true);
      else setMessage(JSON.parse(text).error || 'Грешка при изпълнение');
    } catch {
      setMessage('Грешка при изпълнение на заявката');
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setErrorField(null);
    setErrorMessage('');
    if (!docFrontFile || !docBackFile || !selfieFile) {
      alert('Моля, заснемете предна и задна страна на документа и селфи!');
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('idCardFront', docFrontFile, docFrontFile.name);
    formData.append('idCardBack', docBackFile, docBackFile.name);
    formData.append('selfie', selfieFile, selfieFile.name);
    try {
      const res = await fetch('/verify', { method: 'POST', body: formData });
      const data = await res.json();
      // Ако има error поле, логическа грешка
      if (data.error) {
        console.error('Verification error:', data.error);
        if (data.error.includes('документа')) {
          setErrorField('front');
          setDocFrontFile(null);
          setDocFrontPreview(null);
        } else if (data.error.includes('задна')) {
          setErrorField('back');
          setDocBackFile(null);
          setDocBackPreview(null);
        } else if (data.error.includes('селфито')) {
          setErrorField('selfie');
          setSelfieFile(null);
          setSelfiePreview(null);
        }
        setErrorMessage(data.error);
        return;
      }
      // Ако верификация не е успешна
      if (!data.verified) {
        setErrorField(null);
        setErrorMessage('Лицата не съвпадат, моля опитайте пак');
        return;
      }
      // Успех
      console.log('Verification succeeded:', data);
      alert('Верификацията е успешна!');
    } catch (networkError) {
      console.error('Network error:', networkError);
      setErrorField('network');
      setErrorMessage('Грешка при изпращане на формата');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-dark text-light min-vh-100 d-flex flex-column align-items-center justify-content-center p-4">
      {/* Loading overlay */}
      {isLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1050 }}
        >
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      <h1 className="text-center mt-4 mb-5">{message || 'Authentication'}</h1>
      {!isAuthenticated ? (
        <AuthForm onSubmit={handleAuthSubmit} />
      ) : !selectedCountry ? (
        <div className="card shadow-lg p-4 bg-opacity-90" style={{ maxWidth: 450, width: '100%', borderRadius: '15px' }}>
          <h3 className="mb-3 text-center">Изберете държава</h3>
          <select className="form-select mb-4" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
            <option value="">-- Изберете държава --</option>
            <option value="Bulgaria">България</option>
            <option value="Romania">Румъния</option>
            <option value="Germany">Германия</option>
            <option value="France">Франция</option>
            <option value="Italy">Италия</option>
          </select>
        </div>
      ) : (
        <div className="container d-flex justify-content-center mt-5">
          <div className="card shadow-lg p-4 bg-opacity-90" style={{ maxWidth: 450, width: '100%', borderRadius: '15px' }}>
            <form onSubmit={handleVerificationSubmit}>
              {/* Document Type */}
              <div className="mb-3">
                <label className="form-label">Тип документ</label>
                <select className="form-select mb-4" value={documentType} onChange={e => setDocumentType(e.target.value)}>
                  <option value="ID Card">Лична карта</option>
                  <option value="Passport">Паспорт</option>
                </select>
              </div>

              {/* Front side */}
              <div className="mb-4">
                <label className="form-label">Заснемете {documentType} – предна страна</label>
                {!docFrontPreview && (
                  <button type="button" className="btn btn-outline-secondary d-block mb-2 w-100" onClick={() => frontInputRef.current.click()}>
                    Стартирай камерата за предна страна
                  </button>
                )}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => handleFileCapture(e, 'front')}
                  style={{ display: 'none' }}
                />
                {docFrontPreview && <img src={docFrontPreview} alt="Front Preview" className="img-fluid rounded-3 mb-2" />}
                {errorField === 'front' && <div className="text-danger small mb-2">{errorMessage}</div>}
              </div>

              {/* Back side */}
              <div className="mb-4">
                <label className="form-label">Заснемете {documentType} – задна страна</label>
                {!docBackPreview && (
                  <button type="button" className="btn btn-outline-secondary d-block mb-2 w-100" onClick={() => backInputRef.current.click()}>
                    Стартирай камерата за задна страна
                  </button>
                )}
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => handleFileCapture(e, 'back')}
                  style={{ display: 'none' }}
                />
                {docBackPreview && <img src={docBackPreview} alt="Back Preview" className="img-fluid rounded-3 mb-2" />}
                {errorField === 'back' && <div className="text-danger small mb-2">{errorMessage}</div>}
              </div>

              {/* Selfie */}
              <div className="mb-4">
                <label className="form-label">Заснемете селфи</label>
                {!selfiePreview && (
                  <button type="button" className="btn btn-outline-secondary d-block mb-2 w-100" onClick={() => selfieInputRef.current.click()}>
                    Стартирай камерата за селфи
                  </button>
                )}
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={e => handleFileCapture(e, 'selfie')}
                  style={{ display: 'none' }}
                />
                {selfiePreview && <img src={selfiePreview} alt="Selfie Preview" className="img-fluid rounded-3 mb-2" />}
                {errorField === 'selfie' && <div className="text-danger small mb-2">{errorMessage}</div>}
              </div>

              {errorField === 'network' && <div className="text-danger small mb-3">{errorMessage}</div>}

              <button type="submit" className="btn btn-primary btn-lg w-100">Потвърдете верификацията</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

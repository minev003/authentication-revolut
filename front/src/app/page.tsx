'use client';
import { useRef, useState } from 'react';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
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

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorField, setErrorField] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileCapture = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

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
      else setMessage(JSON.parse(text).error || 'Execution error');
    } catch {
      setMessage('Error executing the request');
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setErrorField(null);
    setErrorMessage('');

    if (!docFrontFile || !docBackFile || !selfieFile) {
      alert('Please take a picture of the front and back of the document and a selfie!');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('idCardFront', docFrontFile, docFrontFile.name);
    formData.append('idCardBack', docBackFile, docBackFile.name);
    formData.append('selfie', selfieFile, selfieFile.name);

    // Always read text to avoid JSON parse errors on non-JSON responses
    const res = await fetch('/verify', { method: 'POST', body: formData });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    // Handle any HTTP error or logical error
    if (!res.ok || data.error) {
      const msg = data.error || res.statusText;
      console.error('Verification error:', msg);
      if (msg.includes('document') || msg.includes('документа')) {
        setErrorField('front');
        setDocFrontFile(null);
        setDocFrontPreview(null);
      } else if (msg.includes('back') || msg.includes('задна')) {
        setErrorField('back');
        setDocBackFile(null);
        setDocBackPreview(null);
      } else if (msg.includes('selfie') || msg.includes('селфито')) {
        setErrorField('selfie');
        setSelfieFile(null);
        setSelfiePreview(null);
      } else {
        setErrorField('network');
      }
      setErrorMessage(msg);
      setIsLoading(false);
      return;
    }

    // At this point res.ok and no data.error
    if (!data.verified) {
      setErrorField(null);
      setErrorMessage('The faces do not match, please try again.');
      setIsLoading(false);
      return;
    }

    console.log('Verification succeeded:', data);
    alert('Verification succeeded!');
    setIsLoading(false);
  };

  return (
    <div className="bg-dark text-light min-vh-100 d-flex flex-column align-items-center justify-content-center p-4">
      {/* Loading overlay */}
      {isLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            zIndex: 2000
          }}
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
          <h3 className="mb-3 text-center">Select Country</h3>
          <select className="form-select mb-4" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
            <option value="">-- Select Country --</option>
            <option value="Bulgaria">Bulgaria</option>
            <option value="Romania">Romania</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="Italy">Italy</option>
          </select>
        </div>
      ) : (
        <div className="container d-flex justify-content-center mt-5">
          <div className="card shadow-lg p-4 bg-opacity-90" style={{ maxWidth: 450, width: '100%', borderRadius: '15px' }}>
            <form onSubmit={handleVerificationSubmit}>
              <div className="mb-3">
                <label className="form-label">Document Type</label>
                <select className="form-select mb-4" value={documentType} onChange={e => setDocumentType(e.target.value)}>
                  <option value="ID Card">ID Card</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label">Document Front – Front Side</label>
                {!docFrontPreview && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-block mb-2 w-100"
                    onClick={() => frontInputRef.current.click()}
                  >
                    Capture Front Photo
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

              <div className="mb-4">
                <label className="form-label">Document Back – Back Side</label>
                {!docBackPreview && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-block mb-2 w-100"
                    onClick={() => backInputRef.current.click()}
                  >
                    Capture Back Photo
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

              <div className="mb-4">
                <label className="form-label">Capture Selfie</label>
                {!selfiePreview && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-block mb-2 w-100"
                    onClick={() => selfieInputRef.current.click()}
                  >
                    Capture Selfie
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

              <button type="submit" className="btn btn-primary btn-lg w-100">
                Confirm Verification
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

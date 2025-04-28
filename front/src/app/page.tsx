'use client';
import { useRef, useState } from 'react';
import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [image, setImage] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [showIdCardCamera, setShowIdCardCamera] = useState(false);

  const selfieVideoRef = useRef(null);
  const selfieCanvasRef = useRef(null);
  const idCardVideoRef = useRef(null);
  const idCardCanvasRef = useRef(null);

  const base64ToBlob = (base64Data) => {
    const [base64, mime] = base64Data.split(';');
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset++) {
      byteArrays.push(byteCharacters.charCodeAt(offset));
    }
    const byteArray = new Uint8Array(byteArrays);
    return new Blob([byteArray], { type: mime });
  };

  const handleFormSubmit = async (formData, isSignUp) => {
    const formDataWithSignUp = { ...formData, isSignUp };
    const url = '/api/auth';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataWithSignUp),
      });

      const textResponse = await res.text();
      console.log('Response Text:', textResponse);

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const data = JSON.parse(textResponse);
        setMessage(data.error || 'Грешка при изпълнение');
      }
    } catch (error) {
      console.error(error);
      setMessage('Грешка при изпълнение на заявката');
    }
  };

  const startCamera = async (type) => {
    const isSelfie = type === 'selfie';
    const videoRef = isSelfie ? selfieVideoRef : idCardVideoRef;
    const setShowCamera = isSelfie ? setShowSelfieCamera : setShowIdCardCamera;

    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      alert('Не може да се достъпи камерата');
    }
  };

  const takePhoto = (type) => {
    const isSelfie = type === 'selfie';
    const video = isSelfie ? selfieVideoRef.current : idCardVideoRef.current;
    const canvas = isSelfie ? selfieCanvasRef.current : idCardCanvasRef.current;
    const context = canvas.getContext('2d');

    if (video && canvas && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      console.log(dataUrl);

      if (isSelfie) {
        setSelfie(dataUrl);
        setShowSelfieCamera(false);
      } else {
        setImage(dataUrl);
        setShowIdCardCamera(false);
      }

      video.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();

    if (!image || !selfie) {
      alert('Моля, заснемете както личната карта, така и селфи!');
      return;
    }

    const formData = new FormData();
    formData.append('idCard', base64ToBlob(image), 'idCard.jpg');
    formData.append('selfie', base64ToBlob(selfie), 'selfie.jpg');
    formData.append('country', selectedCountry);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        body: formData,
      });

      const textResponse = await res.text();
      console.log('Verification Response:', textResponse);

      if (res.ok) {
        alert('Верификацията е успешна!');
      } else {
        const data = JSON.parse(textResponse);
        alert(`Грешка при верификация: ${data.error}`);
      }
    } catch (error) {
      alert('Грешка при изпращане на верификация');
    }
  };

  return (
    <div className="bg-dark text-light min-vh-100 d-flex flex-column align-items-center justify-content-center p-4">
      <h1 className="text-center mt-4 mb-5">{message || 'Authentication'}</h1>

      {!isAuthenticated ? (
        <AuthForm onSubmit={handleFormSubmit} />
      ) : !selectedCountry ? (
        <div className="card shadow-lg p-4 bg-opacity-90" style={{ width: '100%', maxWidth: '450px', borderRadius: '15px' }}>
          <h3 className="mb-3 text-center">Изберете държава</h3>
          <select
            className="form-select mb-4"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
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
          <div className="card shadow-lg p-4 bg-opacity-90" style={{ width: '100%', maxWidth: '450px', borderRadius: '15px' }}>
            <form onSubmit={handleSubmitVerification}>
              <div className="mb-4">
                <label className="form-label">Заснемете личната си карта или паспорт</label>

                {!image && !showIdCardCamera && (
                  <div className="d-grid gap-2 mb-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => startCamera('idCard')}>
                      Стартирай камерата за лична карта
                    </button>
                  </div>
                )}

                {showIdCardCamera && (
                  <div className="text-center mb-3">
                    <video ref={idCardVideoRef} autoPlay className="w-100 rounded-3 shadow-sm mb-2" />
                    <div className="d-grid gap-2">
                      <button type="button" className="btn btn-success" onClick={() => takePhoto('idCard')}>
                        Заснеми личната карта
                      </button>
                    </div>
                    <canvas ref={idCardCanvasRef} style={{ display: 'none' }} />
                  </div>
                )}

                {image && (
                  <div className="mb-3">
                    <img src={image} alt="ID Card Preview" className="img-fluid rounded-3 shadow-sm" />
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label">Заснемете селфи за сравнение</label>

                {!selfie && !showSelfieCamera && (
                  <div className="d-grid gap-2 mb-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => startCamera('selfie')}>
                      Стартирай камерата за селфи
                    </button>
                  </div>
                )}

                {showSelfieCamera && (
                  <div className="text-center mb-3">
                    <video ref={selfieVideoRef} autoPlay className="w-100 rounded-3 shadow-sm mb-2" />
                    <div className="d-grid gap-2">
                      <button type="button" className="btn btn-success" onClick={() => takePhoto('selfie')}>
                        Заснеми селфи
                      </button>
                    </div>
                    <canvas ref={selfieCanvasRef} style={{ display: 'none' }} />
                  </div>
                )}

                {selfie && (
                  <div className="mb-3">
                    <img src={selfie} alt="Selfie Preview" className="img-fluid rounded-3 shadow-sm" />
                  </div>
                )}
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary btn-lg">
                  Потвърдете верификацията
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
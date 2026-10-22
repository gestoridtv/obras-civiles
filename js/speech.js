(function () {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

  function disponible() {
    return !!SpeechRecognitionImpl;
  }

  let reconocimientoActivo = null;

  function iniciar({ onResultado, onError, idioma }) {
    if (!disponible()) {
      onError(new Error('SpeechRecognition no soportado en este navegador'));
      return;
    }
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = idioma || 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const texto = event.results[0][0].transcript;
      onResultado(texto);
    };
    recognition.onerror = (event) => {
      onError(new Error('Error de reconocimiento de voz: ' + event.error));
    };
    recognition.onend = () => {
      reconocimientoActivo = null;
    };

    reconocimientoActivo = recognition;
    recognition.start();
  }

  function detener() {
    if (reconocimientoActivo) {
      reconocimientoActivo.stop();
      reconocimientoActivo = null;
    }
  }

  window.Speech = { disponible, iniciar, detener };
})();

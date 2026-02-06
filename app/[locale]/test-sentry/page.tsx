'use client';

export default function TestSentryPage() {
  const handleTestError = () => {
    // Isso vai gerar um erro e enviar para o Sentry
    throw new Error('🧪 Teste do Sentry - Erro intencional!');
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Teste do Sentry</h1>
      <button 
        onClick={handleTestError}
        style={{
          padding: '20px 40px',
          fontSize: '18px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        🔥 Gerar Erro de Teste
      </button>
      <p style={{ marginTop: '20px', color: '#666' }}>
        Clique no botão acima para enviar um erro de teste para o Sentry
      </p>
    </div>
  );
}

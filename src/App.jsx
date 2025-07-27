import React, { useState, useEffect } from 'react';

const RekognitionApp = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Configuración AWS (estas deberían venir de variables de entorno en Amplify)
  const AWS_CONFIG = {
    region: 'us-east-1', // Cambia por tu región
    inputBucket: 'my-input-bucket',
    outputBucket: 'my-output-bucket',
    identityPoolId: 'us-east-1:your-identity-pool-id', // Reemplaza con tu Identity Pool ID
    apiEndpoint: 'https://your-api-gateway-endpoint.com' // Opcional: para consultar resultados
  };

  useEffect(() => {
    // Cargar historial de imágenes procesadas desde localStorage
    const savedImages = JSON.parse(localStorage.getItem('uploadedImages') || '[]');
    setUploadedImages(savedImages);
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadToS3 = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Configurar AWS SDK (en un proyecto real, esto se haría con AWS Amplify)
      // Por ahora simularemos la subida
      
      const fileName = `${Date.now()}-${selectedFile.name}`;
      
      // Simular progreso de subida
      const simulateUpload = () => {
        return new Promise((resolve) => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
              progress = 100;
              clearInterval(interval);
              resolve();
            }
            setUploadProgress(Math.min(progress, 100));
          }, 200);
        });
      };

      await simulateUpload();

      // Agregar a la lista de imágenes subidas
      const newImage = {
        id: Date.now(),
        fileName,
        originalName: selectedFile.name,
        uploadTime: new Date().toISOString(),
        status: 'processing',
        size: selectedFile.size
      };

      const updatedImages = [newImage, ...uploadedImages];
      setUploadedImages(updatedImages);
      localStorage.setItem('uploadedImages', JSON.stringify(updatedImages));

      // Simular procesamiento con Lambda + Rekognition
      setTimeout(() => {
        processImage(newImage.id);
      }, 3000);

      // Limpiar formulario
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      
    } catch (err) {
      setError('Error al subir la imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const processImage = async (imageId) => {
    // Simular resultados de Rekognition
    const mockResults = {
      labels: [
        { Name: 'Person', Confidence: 98.5 },
        { Name: 'Human', Confidence: 98.2 },
        { Name: 'Face', Confidence: 95.8 },
        { Name: 'Smile', Confidence: 87.3 },
        { Name: 'Portrait', Confidence: 84.1 }
      ],
      faces: [
        {
          AgeRange: { High: 35, Low: 25 },
          Gender: { Value: 'Female', Confidence: 96.2 },
          Emotions: [
            { Type: 'HAPPY', Confidence: 89.5 },
            { Type: 'CALM', Confidence: 78.2 }
          ]
        }
      ],
      text: ['HELLO', 'WORLD', '2024'],
      celebrities: [],
      processedAt: new Date().toISOString()
    };

    // Actualizar estado de la imagen
    const updatedImages = uploadedImages.map(img => 
      img.id === imageId 
        ? { ...img, status: 'completed', results: mockResults }
        : img
    );
    
    setUploadedImages(updatedImages);
    localStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
  };

  const viewResults = (image) => {
    setResults(image.results);
  };

  const downloadResults = (image) => {
    const dataStr = JSON.stringify(image.results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `results-${image.originalName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 text-indigo-600 text-2xl">👁️</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Análisis de Imágenes con AWS Rekognition
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Sube tus imágenes y obtén análisis detallado con IA
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Panel de Subida */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <div className="text-indigo-600 text-xl">📤</div>
              Subir Imagen
            </h2>

            {/* Área de arrastrar y soltar */}
            <div 
              className="border-3 border-dashed border-indigo-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-indigo-50/50"
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {previewUrl ? (
                <div className="space-y-4">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                  />
                  <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 text-indigo-400 mx-auto text-4xl flex items-center justify-center">🖼️</div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      Haz clic para seleccionar una imagen
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Formatos: JPG, PNG, GIF (máx. 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de progreso */}
            {uploading && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Subiendo... {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Botón de subida */}
            <button
              onClick={uploadToS3}
              disabled={!selectedFile || uploading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Subiendo...
                </span>
              ) : (
                'Subir y Analizar'
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <span className="text-red-500">⚠️</span>
                {error}
              </div>
            )}
          </div>

          {/* Panel de Historial */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Historial de Análisis
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {uploadedImages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3 opacity-50">🖼️</div>
                  <p>Aún no has subido imágenes</p>
                </div>
              ) : (
                uploadedImages.map((image) => (
                  <div key={image.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {image.originalName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(image.uploadTime).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {image.status === 'processing' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-indigo-600">Procesando...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-green-600">✅</span>
                              <span className="text-sm text-green-600">Completado</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {image.status === 'completed' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewResults(image)}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200 transition-colors"
                          >
                            Ver Resultados
                          </button>
                          <button
                            onClick={() => downloadResults(image)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors flex items-center gap-1"
                          >
                            <span>💾</span>
                            Descargar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel de Resultados */}
        {results && (
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Resultados del Análisis</h2>
              <button
                onClick={() => setResults(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Etiquetas */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-3">Etiquetas Detectadas</h3>
                <div className="space-y-2">
                  {results.labels?.slice(0, 5).map((label, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{label.Name}</span>
                      <span className="text-blue-600 font-medium">
                        {label.Confidence.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rostros */}
              {results.faces?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-3">Análisis Facial</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Edad:</span>
                      <span className="text-green-600 font-medium">
                        {results.faces[0].AgeRange.Low}-{results.faces[0].AgeRange.High}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Género:</span>
                      <span className="text-green-600 font-medium">
                        {results.faces[0].Gender.Value}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Emoción:</span>
                      <span className="text-green-600 font-medium">
                        {results.faces[0].Emotions[0].Type}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Texto */}
              {results.text?.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-semibold text-purple-800 mb-3">Texto Detectado</h3>
                  <div className="space-y-1">
                    {results.text.map((text, idx) => (
                      <div key={idx} className="text-sm text-gray-700 bg-white px-2 py-1 rounded">
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información */}
              <div className="bg-orange-50 rounded-xl p-4">
                <h3 className="font-semibold text-orange-800 mb-3">Información</h3>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-700">
                    <strong>Procesado:</strong><br />
                    {new Date(results.processedAt).toLocaleString()}
                  </div>
                  <div className="text-gray-700">
                    <strong>Total etiquetas:</strong> {results.labels?.length || 0}
                  </div>
                  <div className="text-gray-700">
                    <strong>Rostros:</strong> {results.faces?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RekognitionApp;
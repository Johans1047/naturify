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

  // Configuración de API (solo un endpoint)
  const API_CONFIG = {
    uploadEndpoint: import.meta.env.VITE_UPLOAD_API || 'https://f6xlt7r4i0.execute-api.us-east-2.amazonaws.com/dev'
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

  // Función para convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const uploadToAPI = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Convertir archivo a base64
      const base64Data = await fileToBase64(selectedFile);
      // Remover el prefijo "data:image/jpeg;base64," o similar
      const base64Image = base64Data.split(',')[1];
      
      // Simular progreso mientras se procesa
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 10, 90));
      }, 500);

      console.log('Base64 Image:', base64Image.slice(0, 50) + '...'); // Log para depuración
      console.log('File Name:', selectedFile.name);
      console.log('File Size:', selectedFile.size, 'bytes');
      console.log('File Type:', selectedFile.type);
      console.log('API Endpoint:', API_CONFIG.uploadEndpoint);
      
      // Enviar como JSON con la imagen en base64
      const response = await fetch(API_CONFIG.uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size
        })
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);

      const responseBody = JSON.parse(result.body);

      // Agregar a la lista con resultados ya listos
      const newImage = {
        id: Date.now(),
        fileName: result.fileName,
        originalName: selectedFile.name,
        uploadTime: new Date().toISOString(),
        status: 'completed', // Ya está procesado
        size: selectedFile.size,
        results: responseBody.results, // Resultados incluidos en el elemento body de la respuesta
        deepResponse: JSON.parse(responseBody.deep_response) || ''
      };

      const descriptionResponse = newImage.deepResponse.output.message.content[0].text;
      const description = descriptionResponse.match(/"([^"]+)"/)[1];
      console.log('New Image Object:', descriptionResponse);
      
      console.log(descriptionResponse.match(/"([^"]+)"/)[1]);


      const updatedImages = [newImage, ...uploadedImages];
      setUploadedImages(updatedImages);
      localStorage.setItem('uploadedImages', JSON.stringify(updatedImages));

      // Limpiar formulario
      setSelectedFile(null);
      setPreviewUrl(null);
      
    } catch (err) {
      setError('Error al procesar la imagen: ' + err.message);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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
    link.download = `analysis-results-${Date.now()}-${image.originalName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteImage = (imageId) => {
    const updatedImages = uploadedImages.filter(img => img.id !== imageId);
    setUploadedImages(updatedImages);
    localStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
  };

  const clearHistory = () => {
    setUploadedImages([]);
    localStorage.removeItem('uploadedImages');
    setResults(null);
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
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-indigo-400');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-indigo-400');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-indigo-400');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const event = { target: { files: [files[0]] } };
                  handleFileSelect(event);
                }
              }}
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
                  <p className="text-xs text-gray-500">
                    Tamaño: {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 text-indigo-400 mx-auto text-4xl flex items-center justify-center">🖼️</div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      Haz clic para seleccionar una imagen
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      O arrastra y suelta aquí
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
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
                    Procesando imagen... {Math.round(uploadProgress)}%
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
              onClick={uploadToAPI}
              disabled={!selectedFile || uploading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </span>
              ) : (
                'Subir y Analizar'
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <span className="text-red-500">⚠️</span>
                <div className="flex-1">
                  {error}
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Panel de Historial */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Historial de Análisis
              </h2>
              {uploadedImages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                >
                  Limpiar Todo
                </button>
              )}
            </div>

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
                        <p className="text-xs text-gray-400">
                          {(image.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-green-600">✅</span>
                          <span className="text-sm text-green-600">Completado</span>
                        </div>
                      </div>
                      
                      {image.results && (
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
                          <button
                            onClick={() => deleteImage(image.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                          >
                            🗑️
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
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <span>🏷️</span>
                  Etiquetas Detectadas
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.labels?.slice(0, 8).map((label, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate">{label.Name}</span>
                      <span className="text-blue-600 font-medium ml-2">
                        {label.Confidence.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información */}
              <div className="bg-orange-50 rounded-xl p-4">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <span>ℹ️</span>
                  Información
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-700">
                    <strong>Procesado:</strong><br />
                    <span className="text-xs">
                      {new Date(results.processedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    <strong>Etiquetas:</strong> {results.labels?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Botón para descargar resultados completos */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(results, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `analysis-results-${Date.now()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md"
              >
                📥 Descargar Análisis Completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RekognitionApp;
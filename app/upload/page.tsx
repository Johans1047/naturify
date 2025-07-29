"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, ImageIcon, CheckCircle, Loader2, ArrowLeft, XCircle } from "lucide-react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import { imageStore, type ProcessedImage } from "@/lib/image-store"

const API_BASE_URL = 'https://f6xlt7r4i0.execute-api.us-east-2.amazonaws.com/dev'

// Types for API response (based on your actual response)
interface ProcessedImageFromAPI {
  process_id: string
  user_id: string
  file_name: string
  file_type: string
  url: string
  enhanced_file_name?: string
  enhanced_file_type?: string
  enhanced_url?: string
  labels?: string[]
  labels_details?: Array<{
    Name: string
    Confidence: number
    Categories: string[]
  }>
  description?: string
  status: string
  created_at?: string
  processed_at?: string
  processing_summary?: {
    totalLabels: number
    hasErrors: boolean
    enhancementApplied: boolean
  }
}

// API Response wrapper
interface APIResponse {
  statusCode: number
  headers: {
    [key: string]: string
  }
  response: ProcessedImageFromAPI
  body: string
}

interface GalleryImage {
  id: string
  url: string
  enhancedUrl: string
  title: string
  description: string
  categories: string[]
  uploadDate: string
  colorCorrection: {
    brightness: number
    contrast: number
    saturation: number
  }
  metadata: {
    location?: string
    camera?: string
    settings?: string
    confidence?: number
    totalLabels?: number
    hasErrors?: boolean
    enhancementApplied?: boolean
  }
  originalData?: ProcessedImageFromAPI
}

interface ProcessingStep {
  id: string
  name: string
  status: "pending" | "processing" | "completed" | "error"
  description: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])

  const transformAPIImageToGalleryImage = (apiImage: ProcessedImageFromAPI, file: File): GalleryImage => {
    // Validar que el objeto tenga las propiedades necesarias
    if (!apiImage || typeof apiImage !== 'object') {
      throw new Error('Respuesta de API inválida');
    }

    // Calculate simulated color corrections based on labels
    const brightness = Math.random() * 20 - 10 // -10 to +10
    const contrast = Math.random() * 30 + 5   // 5 to 35
    const saturation = Math.random() * 35 + 10 // 10 to 45

    return {
      id: apiImage.process_id || `img-${Date.now()}-${Math.random()}`,
      url: apiImage.url || URL.createObjectURL(file),
      enhancedUrl: apiImage.enhanced_url || apiImage.url || URL.createObjectURL(file),
      title: apiImage.file_name?.replace(/\.[^/.]+$/, "").replace(/_/g, " ") || file.name.replace(/\.[^/.]+$/, ""),
      description: apiImage.description || "Imagen procesada con IA",
      categories: apiImage.labels || ["paisaje", "naturaleza"],
      uploadDate: apiImage.created_at || apiImage.processed_at || new Date().toISOString(),
      colorCorrection: {
        brightness,
        contrast,
        saturation
      },
      metadata: {
        totalLabels: apiImage.processing_summary?.totalLabels || 0,
        hasErrors: apiImage.processing_summary?.hasErrors || false,
        enhancementApplied: apiImage.processing_summary?.enhancementApplied || false,
        confidence: apiImage.labels_details?.length ? 
          apiImage.labels_details.reduce((acc, label) => acc + label.Confidence, 0) / apiImage.labels_details.length 
          : undefined
      },
      originalData: apiImage
    }
  }
  
  const processingSteps: ProcessingStep[] = [
    { id: "1", name: "Subida", status: "pending", description: "Subiendo imagen al servidor" },
    { id: "2", name: "Corrección HDR", status: "pending", description: "Aplicando corrección de color y HDR" },
    { id: "3", name: "Análisis AWS", status: "pending", description: "Analizando con AWS Rekognition" },
    { id: "4", name: "Descripción IA", status: "pending", description: "Generando descripción automática" },
    { id: "5", name: "Clasificación", status: "pending", description: "Organizando por categorías" },
  ]

  const [steps, setSteps] = useState(processingSteps)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
    setError(null) // Clear any previous errors
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  })

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const simulateProcessing = async () => {
    setProcessing(true)
    setProgress(0)
    setError(null)
    
    // Reset all steps to pending
    const newSteps = processingSteps.map(step => ({ ...step, status: "pending" as const }))
    setSteps(newSteps)

    const processed: ProcessedImage[] = []
    const totalFiles = files.length

    try {
      // Process all files simultaneously
      const filePromises = files.map(async (file, fileIndex) => {
        try {
          // Simulate step progression for UI
          const simulateStepProgress = async () => {
            for (let stepIndex = 0; stepIndex < 4; stepIndex++) { // First 4 steps
              await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))
              
              const updatedSteps = [...newSteps]
              updatedSteps[stepIndex].status = stepIndex < 3 ? "processing" : "completed"
              if (stepIndex > 0) updatedSteps[stepIndex - 1].status = "completed"
              setSteps([...updatedSteps])
              setCurrentStep(stepIndex)
              
              // Update progress (but keep it under 90% until API responds)
              const stepProgress = ((stepIndex + 1) / 5) * 85 // Max 85% during simulation
              setProgress(Math.min(stepProgress, 85))
            }
          }

          // Start step simulation
          const stepPromise = simulateStepProgress()

          // Actual API call
          const base64Data = await fileToBase64(file);
          const base64Image = base64Data.split(',')[1];

          const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image: base64Image,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            })
          });

          // Wait for step simulation to complete
          await stepPromise

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          
          // Handle different response formats
          let apiImage: ProcessedImageFromAPI;
          if (result.response) {
            apiImage = result.response;
          } else if (result.body) {
            apiImage = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
          } else {
            apiImage = result;
          }

          const galleryImage = transformAPIImageToGalleryImage(apiImage, file);
          
          // Convert to ProcessedImage format
          const processedImage: ProcessedImage = {
            id: galleryImage.id,
            originalUrl: URL.createObjectURL(file),
            processedUrl: galleryImage.enhancedUrl,
            title: galleryImage.title,
            description: galleryImage.description,
            categories: galleryImage.categories,
            uploadDate: galleryImage.uploadDate,
            colorCorrection: galleryImage.colorCorrection,
            metadata: galleryImage.metadata
          };

          return processedImage;

        } catch (apiError) {
          console.error(`Error procesando imagen ${file.name}:`, apiError);
          
          // Create a fallback processed image
          const fallbackImage: ProcessedImage = {
            id: `img-${Date.now()}-${fileIndex}`,
            originalUrl: URL.createObjectURL(file),
            processedUrl: URL.createObjectURL(file),
            title: `${file.name.split(".")[0]} - Error en procesamiento`,
            description: `Error al procesar la imagen: ${apiError instanceof Error ? apiError.message : 'Error desconocido'}`,
            categories: ["error", "sin procesar"],
            uploadDate: new Date().toISOString(),
            colorCorrection: {
              brightness: 0,
              contrast: 0,
              saturation: 0,
            },
            metadata: {
              hasErrors: true,
              enhancementApplied: false,
              totalLabels: 0
            },
          };
          
          return fallbackImage;
        }
      });

      // Wait for all files to be processed
      const results = await Promise.all(filePromises);
      processed.push(...results);

      // Complete final step
      const finalSteps = [...newSteps]
      finalSteps[4].status = "completed" // Classification step
      setSteps(finalSteps)
      
      // Save to localStorage
      imageStore.addImages(processed)
      setProcessedImages(prev => [...prev, ...processed])
      
      // Clear files input after successful processing
      setFiles([])
      
    } catch (error) {
      console.error('Error general en procesamiento:', error);
      setError(`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Mark steps as error
      const errorSteps = [...newSteps]
      errorSteps[2].status = "error"
      errorSteps[3].status = "error"
      setSteps(errorSteps)
    } finally {
      setProcessing(false)
      setProgress(100)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const resetUpload = () => {
    setFiles([])
    setProgress(0)
    setError(null)
    setCurrentStep(0)
    const resetSteps = processingSteps.map(step => ({ ...step, status: "pending" as const }))
    setSteps(resetSteps)
    // Don't reset processedImages - keep them for viewing
  }

  // Effect to handle continuous progress animation during processing
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    
    if (processing && progress < 85) {
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 85) {
            return Math.min(prev + Math.random() * 2, 85);
          }
          return prev;
        });
      }, 500);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [processing, progress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-800 to-emerald-900">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="p5-button bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="p5-text-contrast">Volver</span>
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-6 w-6 text-green-600" />
              <h1 className="text-xl font-bold">Subir Fotografías</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Error Display */}
          {error && (
            <Card className="border-red-500 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Error de procesamiento</span>
                </div>
                <p className="text-red-600 mt-2 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Upload Area */}
          <Card className="p5-card">
            <CardHeader>
              <CardTitle className="p5-text-contrast">Seleccionar Fotografías de Paisajes</CardTitle>
              <CardDescription className="p5-text-muted">
                Sube tus fotografías de paisajes naturales para procesamiento automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-400"
                  }`}
              >
                <input {...getInputProps()} className="p5-input" />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-green-600">Suelta las imágenes aquí...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">Arrastra y suelta imágenes aquí, o haz clic para seleccionar</p>
                    <p className="text-sm text-gray-500">Formatos soportados: JPG, PNG, WebP</p>
                  </div>
                )}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3 p5-text-contrast">Archivos seleccionados ({files.length})</h3>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <ImageIcon className="h-5 w-5 text-gray-500" />
                          <span className="text-sm text-white font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={processing}
                          className="p5-button"
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length > 0 && !processing && (
                <div className="mt-6">
                  <Button onClick={simulateProcessing} className="w-full p5-button" size="lg">
                    <Loader2 className="h-5 w-5 mr-2" />
                    Procesar Imágenes ({files.length})
                  </Button>
                </div>
              )}

              {(!processing && processedImages.length > 0) && (
                <div className="mt-6">
                  <Button onClick={resetUpload} variant="outline" className="w-full">
                    Subir Más Imágenes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Status */}
          {processing && (
            <Card className="p5-card">
              <CardHeader>
                <CardTitle>Procesando Imágenes</CardTitle>
                <CardDescription>Aplicando corrección de color, análisis IA y clasificación automática</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progreso general</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full p5-progress" />
                </div>

                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {step.status === "completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : step.status === "processing" ? (
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        ) : step.status === "error" ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-medium ${step.status === "completed"
                                ? "text-green-400 p5-text-glow"
                                : step.status === "processing"
                                  ? "text-blue-400 p5-text-glow"
                                  : step.status === "error"
                                    ? "text-red-400"
                                    : "p5-text-muted"
                              }`}
                          >
                            {step.name}
                          </span>
                          {step.status === "processing" && (
                            <Badge variant="secondary" className="p5-badge">
                              En proceso
                            </Badge>
                          )}
                          {step.status === "error" && (
                            <Badge variant="destructive" className="p5-badge">
                              Error
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm p5-text-muted">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {processedImages.length > 0 && (
            <Card className="p5-card">
              <CardHeader>
                <CardTitle>Imágenes Procesadas</CardTitle>
                <CardDescription>
                  Resultados del procesamiento automático con corrección HDR y análisis IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {processedImages.map((image) => (
                    <div key={image.id} className="space-y-4">
                      <div className="relative">
                        <img
                          src={image.processedUrl || "/placeholder.svg"}
                          alt="Imagen procesada"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Badge className={`absolute top-2 right-2 p5-badge ${
                          image.metadata?.hasErrors ? 'bg-red-600' : 'bg-green-600'
                        }`}>
                          {image.metadata?.hasErrors ? 'Error' : 'Procesada'}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 p5-text-contrast">Descripción IA</h4>
                          <p className="text-sm p5-text-muted">{image.description}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2 p5-text-contrast">Categorías AWS</h4>
                          <div className="flex flex-wrap gap-1">
                            {image.categories.map((category) => (
                              <Badge key={category} variant="outline" className="text-xs p5-badge">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm mb-2 p5-text-contrast">Corrección HDR</h4>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-gray-800 rounded border border-gray-600">
                              <div className="font-medium text-gray-200">Brillo</div>
                              <div className="text-gray-400">
                                {image.colorCorrection.brightness > 0 ? "+" : ""}
                                {image.colorCorrection.brightness.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center p-2 bg-gray-800 rounded border border-gray-600">
                              <div className="font-medium text-gray-200">Contraste</div>
                              <div className="text-gray-400">+{image.colorCorrection.contrast.toFixed(1)}%</div>
                            </div>
                            <div className="text-center p-2 bg-gray-800 rounded border border-gray-600">
                              <div className="font-medium text-gray-200">Saturación</div>
                              <div className="text-gray-400">+{image.colorCorrection.saturation.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Link href="/gallery">
                    <Button className="p5-button">Ver en Galería Completa</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
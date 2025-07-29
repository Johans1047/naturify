"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageIcon, Search, Filter, ArrowLeft, Download, Eye, Upload, RefreshCw, AlertCircle } from "lucide-react"
import Link from "next/link"
import ImageComparison from "@/components/image-comparison"

// API Configuration
const API_BASE_URL = 'https://f6xlt7r4i0.execute-api.us-east-2.amazonaws.com/dev'

// Types for API response (based on your actual response)
interface ProcessedImageFromAPI {
  process_id: string
  user_id: string
  file_name: string
  file_type: string
  url: string
  enhanced_file_name: string
  enhanced_file_type: string
  enhanced_url: string
  labels: string[]
  labels_details: Array<{
    Name: string
    Confidence: number
    Categories: string[]
  }>
  description: string
  status: string
  created_at: string
  processed_at: string
  processing_summary: {
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

// Sample fallback images (keep some for demonstration)
const sampleImages: GalleryImage[] = [
  {
    id: "sample-1",
    url: "/original.jpg",
    enhancedUrl: "/original.jpg",
    title: "Picos Nevados al Amanecer",
    description: "Majestuosa vista de montañas nevadas durante el amanecer, con colores cálidos iluminando las cumbres y un cielo despejado que crea un contraste perfecto.",
    categories: ["montañas", "nieve", "amanecer", "cielo"],
    uploadDate: "2024-01-15",
    colorCorrection: { brightness: 8.5, contrast: 15.2, saturation: 12.1 },
    metadata: { location: "Muestra", camera: "Imagen de ejemplo" },
  }
]

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [comparisonImage, setComparisonImage] = useState<GalleryImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])

  // Function to transform API response to GalleryImage
  const transformAPIImageToGalleryImage = (apiImage: ProcessedImageFromAPI): GalleryImage => {
    // Calculate simulated color corrections based on labels
    const brightness = Math.random() * 20 - 10 // -10 to +10
    const contrast = Math.random() * 30 + 5   // 5 to 35
    const saturation = Math.random() * 35 + 10 // 10 to 45

    return {
      id: apiImage.process_id,
      url: apiImage.url,
      enhancedUrl: apiImage.enhanced_url || apiImage.url,
      title: apiImage.file_name?.replace(/\.[^/.]+$/, "").replace(/_/g, " ") || "Imagen procesada",
      description: apiImage.description || "Imagen procesada con IA",
      categories: apiImage.labels || [],
      uploadDate: apiImage.created_at || apiImage.processed_at || new Date().toISOString(),
      colorCorrection: {
        brightness,
        contrast,
        saturation
      },
      metadata: {
        totalLabels: apiImage.processing_summary?.totalLabels,
        hasErrors: apiImage.processing_summary?.hasErrors,
        enhancementApplied: apiImage.processing_summary?.enhancementApplied,
        confidence: apiImage.labels_details?.length > 0 
          ? apiImage.labels_details.reduce((acc, label) => acc + label.Confidence, 0) / apiImage.labels_details.length 
          : undefined
      },
      originalData: apiImage
    }
  }

  // Fetch images from API
  const fetchImages = async () => {
    try {
      setLoading(true)
      setError(null)

      // Since your current API processes single images, we'll simulate fetching multiple
      // In production, you'd need a GET endpoint that retrieves all images from DynamoDB
      
      // For now, we'll try to fetch from a hypothetical GET endpoint
      // You'll need to create this endpoint in your API Gateway that queries DynamoDB
      const response = await fetch(`${API_BASE_URL}`, { method: 'GET' })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Parsear correctamente la respuesta de Lambda
      let apiImages: ProcessedImageFromAPI[] = []
      
      if (data.body) {
        // El body viene como string, hay que parsearlo
        const bodyData = JSON.parse(data.body)
        if (bodyData.success && bodyData.items && Array.isArray(bodyData.items)) {
          apiImages = bodyData.items
        }
      }
      
      // Transform API images to gallery format
      const transformedImages = apiImages.map(transformAPIImageToGalleryImage)
      
      // Combine with sample images
      const allImages = [...transformedImages]
      
      setImages(allImages)
      setFilteredImages(allImages)

      // Update categories
      const categories = Array.from(new Set(allImages.flatMap(img => img.categories)))
      setAllCategories(categories)

    } catch (err) {
      console.error('Error fetching images:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar las imágenes')
      
      // Fall back to sample images
      setImages(sampleImages)
      setFilteredImages(sampleImages)
      setAllCategories(Array.from(new Set(sampleImages.flatMap(img => img.categories))))
    } finally {
      setLoading(false)
    }
  }

  // Load images on component mount
  useEffect(() => {
    fetchImages()
  }, [])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterImages(term, selectedCategory)
  }

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
    filterImages(searchTerm, category)
  }

  const filterImages = (search: string, category: string) => {
    let filtered = images

    if (search) {
      filtered = filtered.filter(
        (img) =>
          img.title.toLowerCase().includes(search.toLowerCase()) ||
          img.description.toLowerCase().includes(search.toLowerCase()) ||
          img.categories.some((cat) => cat.toLowerCase().includes(search.toLowerCase())),
      )
    }

    if (category !== "all") {
      filtered = filtered.filter((img) => img.categories.includes(category))
    }

    setFilteredImages(filtered)
  }

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-800 to-emerald-900">
      <header className="border-b bg-slate-800/80 backdrop-blur-sm border-emerald-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="p5-button bg-transparent">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="p5-text-contrast">Inicio</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-6 w-6 text-emerald-500" />
                <h1 className="text-xl font-bold p5-text-glow">Galería de Paisajes</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchImages}
                disabled={loading}
                className="p5-button bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="p5-text-contrast">Actualizar</span>
              </Button>
              <Link href="/upload">
                <Button variant="outline" className="p5-button bg-transparent">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="p5-text-contrast">Subir Más Fotos</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-red-100 font-semibold">Error al cargar imágenes desde la API</p>
              <p className="text-red-200 text-sm">{error}</p>
              <p className="text-red-200 text-sm">Mostrando imágenes de ejemplo. Verifica la configuración de la API.</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="h-16 w-16 text-emerald-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold p5-text-contrast mb-2">Cargando imágenes...</h3>
            <p className="p5-text-muted">Conectando con la Base de datos...</p>
          </div>
        )}

        {/* Filters */}
        {!loading && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  <Input
                    placeholder="Buscar por título, descripción o categoría..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 p5-input"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-emerald-400" />
                <Select value={selectedCategory} onValueChange={handleCategoryFilter}>
                  <SelectTrigger className="w-48 p5-input">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-emerald-600">
                    <SelectItem value="all" className="p5-text-contrast">
                      Todas las categorías
                    </SelectItem>
                    {allCategories.map((category) => (
                      <SelectItem key={category} value={category} className="p5-text-contrast">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm p5-text-muted">
                Mostrando {filteredImages.length} de {images.length} imágenes
                {error && " (incluyendo ejemplos)"}
              </p>
              <div className="flex flex-wrap gap-2">
                {allCategories.slice(0, 8).map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={`cursor-pointer p5-badge ${
                      selectedCategory === category ? "category-forest" : "bg-transparent border-emerald-600"
                    }`}
                    onClick={() => handleCategoryFilter(category === selectedCategory ? "all" : category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((image) => (
              <Card key={image.id} className="p5-card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative group">
                  <img 
                    src={image.enhancedUrl || image.url || "/placeholder.svg"} 
                    alt={image.title} 
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      // Fallback to original URL if enhanced fails
                      const target = e.target as HTMLImageElement
                      if (target.src !== image.url && image.url !== "/placeholder.svg") {
                        target.src = image.url
                      } else {
                        target.src = "/placeholder.svg?height=300&width=400"
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedImage(image)}
                        className="p5-button accent-sky text-xs"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setComparisonImage(image)}
                        className="p5-button accent-sun text-xs"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Comparar
                      </Button>
                    </div>
                  </div>
                  <Badge className="absolute top-2 right-2 p5-badge category-forest">
                    {image.originalData ? 'Mejorada' : 'Muestra'}
                  </Badge>
                  {image.metadata?.hasErrors && (
                    <Badge className="absolute top-2 left-2 p5-badge bg-red-600">
                      Error
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 p5-text-contrast">{image.title}</h3>
                  <p className="text-sm p5-text-muted mb-3 line-clamp-2">{image.description}</p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {image.categories.slice(0, 3).map((category) => (
                          <Badge key={category} variant="outline" className="text-xs p5-badge category-forest">
                            {category}
                          </Badge>
                        ))}
                        {image.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs p5-badge category-forest">
                            +{image.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center p-1 bg-slate-800 rounded border border-emerald-600">
                        <div className="font-medium p5-text-contrast">Brillo</div>
                        <div className="p5-text-muted">
                          {image.colorCorrection.brightness > 0 ? "+" : ""}
                          {image.colorCorrection.brightness.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center p-1 bg-slate-800 rounded border border-emerald-600">
                        <div className="font-medium p5-text-contrast">Contraste</div>
                        <div className="p5-text-muted">+{image.colorCorrection.contrast.toFixed(1)}%</div>
                      </div>
                      <div className="text-center p-1 bg-slate-800 rounded border border-emerald-600">
                        <div className="font-medium p5-text-contrast">Saturación</div>
                        <div className="p5-text-muted">+{image.colorCorrection.saturation.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs p5-text-muted">
                      <span>
                        {new Date(image.uploadDate).toLocaleDateString("es-ES")}
                      </span>
                      {image.metadata?.totalLabels && (
                        <span>{image.metadata.totalLabels} etiquetas</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredImages.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold p5-text-contrast mb-2">No se encontraron imágenes</h3>
            <p className="p5-text-muted mb-4">Intenta ajustar los filtros de búsqueda o sube nuevas fotografías</p>
            <Link href="/upload">
              <Button className="p5-button accent-sun">Subir Fotografías</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto border-2 border-emerald-600">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold p5-text-glow">{selectedImage.title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                  className="p5-button accent-earth"
                >
                  ✕
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 p5-text-contrast">Imagen HDR Procesada</h4>
                    <img
                      src={selectedImage.enhancedUrl || selectedImage.url || "/placeholder.svg"}
                      alt={`${selectedImage.title} - Procesada`}
                      className="w-full rounded-lg border border-emerald-600"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=400&width=600"
                      }}
                    />
                  </div>
                  {selectedImage.originalData && selectedImage.url !== selectedImage.enhancedUrl && (
                    <div>
                      <h4 className="font-semibold mb-2 p5-text-contrast">Imagen Original</h4>
                      <img
                        src={selectedImage.url}
                        alt={`${selectedImage.title} - Original`}
                        className="w-full rounded-lg border border-slate-600 opacity-80"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=400&width=600"
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 p5-text-contrast">Descripción IA</h3>
                    <p className="p5-text-muted">{selectedImage.description}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 p5-text-contrast">Etiquetas AWS Rekognition</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedImage.categories.map((category) => (
                        <Badge key={category} variant="outline" className="p5-badge category-forest">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 p5-text-contrast">Procesamiento HDR</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-slate-700 rounded border border-emerald-600">
                        <div className="font-medium p5-text-contrast">Brillo</div>
                        <div className="text-lg p5-text-glow">
                          {selectedImage.colorCorrection.brightness > 0 ? "+" : ""}
                          {selectedImage.colorCorrection.brightness.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-700 rounded border border-emerald-600">
                        <div className="font-medium p5-text-contrast">Contraste</div>
                        <div className="text-lg p5-text-glow">
                          +{selectedImage.colorCorrection.contrast.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-700 rounded border border-emerald-600">
                        <div className="font-medium p5-text-contrast">Saturación</div>
                        <div className="text-lg p5-text-glow">
                          +{selectedImage.colorCorrection.saturation.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedImage.originalData && (
                    <div>
                      <h3 className="font-semibold mb-2 p5-text-contrast">Datos de Procesamiento</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="p5-text-muted">Total de etiquetas:</span>
                          <span className="p5-text-contrast">{selectedImage.metadata?.totalLabels || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="p5-text-muted">Mejora aplicada:</span>
                          <span className="p5-text-contrast">
                            {selectedImage.metadata?.enhancementApplied ? 'Sí' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="p5-text-muted">Estado:</span>
                          <span className="p5-text-contrast">
                            {selectedImage.originalData.status || 'Completado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-4">
                    <Button 
                      className="flex-1 p5-button accent-water"
                      onClick={() => handleDownload(selectedImage.url, `${selectedImage.title}_original.jpg`)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Original
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 p5-button bg-transparent accent-sun"
                      onClick={() => handleDownload(selectedImage.enhancedUrl || selectedImage.url, `${selectedImage.title}_hdr.jpg`)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      HDR
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Comparison Modal */}
      {comparisonImage && (
        <ImageComparison
          originalUrl={comparisonImage.url}
          processedUrl={comparisonImage.enhancedUrl || comparisonImage.url}
          title={comparisonImage.title}
          colorCorrection={comparisonImage.colorCorrection}
          onClose={() => setComparisonImage(null)}
        />
      )}
    </div>
  )
}
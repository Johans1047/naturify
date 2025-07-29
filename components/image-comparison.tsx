"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { RotateCcw, Eye, EyeOff, Maximize2, X } from "lucide-react"

interface ImageComparisonProps {
  originalUrl: string
  processedUrl: string
  title: string
  colorCorrection: {
    brightness: number
    contrast: number
    saturation: number
  }
  onClose?: () => void
}

export default function ImageComparison({
  originalUrl,
  processedUrl,
  title,
  colorCorrection,
  onClose,
}: ImageComparisonProps) {
  const [sliderValue, setSliderValue] = useState([50])
  const [showOriginal, setShowOriginal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  const toggleView = () => {
    setShowOriginal(!showOriginal)
  }

  const resetSlider = () => {
    setSliderValue([50])
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (showOriginal) return
      setIsDragging(true)
      updateSliderFromMouse(e)
    },
    [showOriginal],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || showOriginal) return
      updateSliderFromMouse(e)
    },
    [isDragging, showOriginal],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const updateSliderFromMouse = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderValue([percentage])
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <Card
        className={`p5-card ${
          isFullscreen ? "w-[95vw] h-[95vh] max-w-none max-h-none" : "w-full max-w-4xl max-h-[85vh]"
        } overflow-auto`}
      >
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold p5-text-glow p5-text-contrast">{title}</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p5-button text-xs px-3 py-1 accent-sky"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p5-button text-xs px-3 py-1 accent-earth"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 overflow-auto">
          {/* Comparison Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800 rounded-lg border border-emerald-600">
            <div className="flex items-center space-x-4">
              <Button
                onClick={toggleView}
                variant="outline"
                size="sm"
                className="p5-button text-xs bg-transparent accent-water"
              >
                {showOriginal ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                <span className="p5-text-contrast">{showOriginal ? "Mostrar Procesada" : "Mostrar Original"}</span>
              </Button>

              <Button
                onClick={resetSlider}
                variant="outline"
                size="sm"
                className="p5-button text-xs bg-transparent accent-sun"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                <span className="p5-text-contrast">Reset</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Badge className="p5-badge text-xs category-forest">{showOriginal ? "ORIGINAL" : "PROCESADA HDR"}</Badge>
            </div>
          </div>

          {/* Image Comparison */}
          <div className="relative">
            {!showOriginal ? (
              // Slider Comparison Mode
              <div className="rounded-lg border-2 border-emerald-600 overflow-hidden">
                <div
                  ref={imageContainerRef}
                  className={`relative w-full cursor-col-resize select-none ${
                    isFullscreen ? "h-[50vh]" : "h-80 md:h-96"
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Processed Image (Background) */}
                  <img
                    src={processedUrl || "/placeholder.svg?height=400&width=800&query=processed landscape"}
                    alt="Imagen procesada"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />

                  {/* Original Image (Overlay with clip-path) */}
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)`,
                    }}
                  >
                    <img
                      src={originalUrl || "/placeholder.svg?height=400&width=800&query=original landscape"}
                      alt="Imagen original"
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>

                  {/* Slider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-500 shadow-lg z-10 transition-all duration-75 pointer-events-none"
                    style={{ left: `${sliderValue[0]}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <Badge className="p5-badge category-earth">ORIGINAL</Badge>
                  </div>
                  <div className="absolute top-4 right-4 z-20 pointer-events-none">
                    <Badge className="p5-badge category-forest">HDR PROCESADA</Badge>
                  </div>
                </div>

                {/* Slider Control - Mismo ancho que el contenedor de imágenes */}
                <div className="p-4 bg-slate-800 border-t border-emerald-600">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium p5-text-contrast min-w-[80px]">Original</span>
                    <div className="flex-1">
                      <Slider
                        value={sliderValue}
                        onValueChange={setSliderValue}
                        max={100}
                        step={0.1}
                        className="w-full p5-progress"
                      />
                    </div>
                    <span className="text-sm font-medium p5-text-contrast min-w-[80px] text-right">Procesada</span>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-xs p5-text-muted">
                      {sliderValue[0].toFixed(1)}% Original - {(100 - sliderValue[0]).toFixed(1)}% Procesada
                    </span>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-xs p5-text-muted">
                      🌿 Arrastra sobre la imagen o usa la barra para comparar
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Single Image Mode
              <div className="rounded-lg border-2 border-emerald-600 overflow-hidden">
                <img
                  src={showOriginal ? originalUrl : processedUrl || "/placeholder.svg?height=400&width=800"}
                  alt={showOriginal ? "Imagen original" : "Imagen procesada"}
                  className={`w-full object-cover ${isFullscreen ? "h-[50vh]" : "h-80 md:h-96"}`}
                />
              </div>
            )}
          </div>

          {/* HDR Correction Details */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p5-card p-4 text-center p5-hover-effect category-sun">
              <div className="text-2xl font-bold text-amber-400 mb-1 p5-text-glow">
                {colorCorrection.brightness > 0 ? "+" : ""}
                {colorCorrection.brightness.toFixed(1)}%
              </div>
              <div className="text-sm font-medium p5-text-contrast">BRILLO</div>
              <div className="text-xs p5-text-muted mt-1">
                {colorCorrection.brightness > 0 ? "Aumentado" : "Reducido"}
              </div>
            </div>

            <div className="p5-card p-4 text-center p5-hover-effect category-mountains">
              <div className="text-2xl font-bold text-stone-400 mb-1 p5-text-glow">
                +{colorCorrection.contrast.toFixed(1)}%
              </div>
              <div className="text-sm font-medium p5-text-contrast">CONTRASTE</div>
              <div className="text-xs p5-text-muted mt-1">Mejorado</div>
            </div>

            <div className="p5-card p-4 text-center p5-hover-effect category-water">
              <div className="text-2xl font-bold text-blue-400 mb-1 p5-text-glow">
                +{colorCorrection.saturation.toFixed(1)}%
              </div>
              <div className="text-sm font-medium p5-text-contrast">SATURACIÓN</div>
              <div className="text-xs p5-text-muted mt-1">Intensificada</div>
            </div>
          </div>

          {/* Technical Info */}
          <div className="p-4 bg-slate-800 rounded-lg border border-emerald-600">
            <h4 className="font-bold text-emerald-400 mb-2 text-sm p5-text-glow">PROCESAMIENTO HDR APLICADO</h4>
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="p5-text-muted">Algoritmo:</span>
                <span className="p5-text-contrast ml-2">Tone Mapping Natural</span>
              </div>
              <div>
                <span className="p5-text-muted">Corrección de Color:</span>
                <span className="p5-text-contrast ml-2">Automática</span>
              </div>
              <div>
                <span className="p5-text-muted">Rango Dinámico:</span>
                <span className="p5-text-contrast ml-2">Expandido</span>
              </div>
              <div>
                <span className="p5-text-muted">Preservación de Detalles:</span>
                <span className="p5-text-contrast ml-2">Máxima</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

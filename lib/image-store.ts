"use client"

interface ProcessedImage {
  id: string
  originalUrl: string
  processedUrl: string
  title: string
  description: string
  categories: string[]
  uploadDate: string
  colorCorrection: {
    brightness: number
    contrast: number
    saturation: number
  }
  metadata?: {
    location?: string
    camera?: string
    settings?: string
  }
}

class ImageStore {
  private storageKey = "landscape-photos"

  getImages(): ProcessedImage[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  addImage(image: ProcessedImage): void {
    if (typeof window === "undefined") return

    const images = this.getImages()
    const newImages = [image, ...images] // Add to beginning

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(newImages))
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("imagesUpdated"))
    } catch (error) {
      console.error("Failed to save image to localStorage:", error)
    }
  }

  addImages(newImages: ProcessedImage[]): void {
    if (typeof window === "undefined") return

    const existingImages = this.getImages()
    const allImages = [...newImages, ...existingImages]

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(allImages))
      window.dispatchEvent(new CustomEvent("imagesUpdated"))
    } catch (error) {
      console.error("Failed to save images to localStorage:", error)
    }
  }

  removeImage(id: string): void {
    if (typeof window === "undefined") return

    const images = this.getImages().filter((img) => img.id !== id)

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(images))
      window.dispatchEvent(new CustomEvent("imagesUpdated"))
    } catch (error) {
      console.error("Failed to remove image from localStorage:", error)
    }
  }

  clearAll(): void {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(this.storageKey)
      window.dispatchEvent(new CustomEvent("imagesUpdated"))
    } catch (error) {
      console.error("Failed to clear images from localStorage:", error)
    }
  }
}

export const imageStore = new ImageStore()
export type { ProcessedImage }

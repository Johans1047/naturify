import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon, Zap, Tag, Palette, FileText, Mountain, Trees, Waves } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-800 to-emerald-900">
      {/* Header */}
      <header className="border-b bg-slate-800/80 backdrop-blur-sm border-emerald-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mountain className="h-8 w-8 text-emerald-500" />
              <h1 className="text-2xl font-bold p5-text-glow">LandscapeAI</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/upload">
                <Button variant="outline" className="p5-button bg-transparent">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Fotos
                </Button>
              </Link>
              <Link href="/gallery">
                <Button className="p5-button accent-sky">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Ver Galería
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4 text-6xl">
              <Mountain className="text-stone-400" />
              <Trees className="text-emerald-500" />
              <Waves className="text-blue-400" />
            </div>
          </div>
          <h2 className="text-5xl font-bold p5-text-contrast mb-6">
            Procesamiento Inteligente de
            <span className="p5-text-glow"> Paisajes Naturales</span>
          </h2>
          <p className="text-xl p5-text-muted mb-8 max-w-3xl mx-auto">
            Plataforma serverless que corrige automáticamente el color, genera descripciones y organiza tus fotografías
            de paisajes usando AWS Rekognition e IA generativa.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/upload">
              <Button size="lg" className="p5-button accent-sun">
                <Upload className="mr-2 h-5 w-5" />
                Comenzar Ahora
              </Button>
            </Link>
            <Link href="/gallery">
              <Button size="lg" variant="outline" className="p5-button bg-transparent accent-water">
                <ImageIcon className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center p5-text-contrast mb-12">Características Principales</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p5-card category-earth">
              <CardHeader>
                <Palette className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                <CardTitle className="p5-text-contrast">Corrección HDR</CardTitle>
                <CardDescription className="p5-text-muted">
                  Corrección automática de color y exposición para paisajes naturales en HDR
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center p5-card category-forest">
              <CardHeader>
                <FileText className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <CardTitle className="p5-text-contrast">Descripciones IA</CardTitle>
                <CardDescription className="p5-text-muted">
                  Generación automática de descripciones detalladas usando inteligencia artificial
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center p5-card category-sky">
              <CardHeader>
                <Tag className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <CardTitle className="p5-text-contrast">Clasificación AWS</CardTitle>
                <CardDescription className="p5-text-muted">
                  Organización semántica por categorías: ríos, árboles, cielo, montañas, etc.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Flow */}
      <section className="py-16 bg-gradient-to-r from-emerald-900/20 to-blue-900/20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center p5-text-contrast mb-12">Proceso Automatizado</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-emerald-800/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-emerald-500">
                <Upload className="h-8 w-8 text-emerald-400" />
              </div>
              <h4 className="font-semibold mb-2 p5-text-contrast">1. Subir Imagen</h4>
              <p className="text-sm p5-text-muted">Arrastra y suelta tus fotografías de paisajes</p>
            </div>

            <div className="text-center">
              <div className="bg-amber-800/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-amber-500">
                <Zap className="h-8 w-8 text-amber-400" />
              </div>
              <h4 className="font-semibold mb-2 p5-text-contrast">2. Procesamiento</h4>
              <p className="text-sm p5-text-muted">Corrección automática de color y HDR</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-800/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-blue-500">
                <Tag className="h-8 w-8 text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2 p5-text-contrast">3. Análisis IA</h4>
              <p className="text-sm p5-text-muted">Clasificación y descripción automática</p>
            </div>

            <div className="text-center">
              <div className="bg-stone-800/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-stone-500">
                <ImageIcon className="h-8 w-8 text-stone-400" />
              </div>
              <h4 className="font-semibold mb-2 p5-text-contrast">4. Organización</h4>
              <p className="text-sm p5-text-muted">Galería organizada por categorías</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-emerald-600 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Mountain className="h-6 w-6 text-emerald-500" />
            <Trees className="h-6 w-6 text-emerald-400" />
            <Waves className="h-6 w-6 text-blue-400" />
          </div>
          <p className="p5-text-muted">
            &copy; 2024 LandscapeAI. Plataforma serverless para procesamiento inteligente de paisajes.
          </p>
        </div>
      </footer>
    </div>
  )
}

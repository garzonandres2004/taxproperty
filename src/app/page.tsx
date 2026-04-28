import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  MapPin,
  TrendingUp,
  Shield,
  Database,
  CheckCircle,
  ArrowRight,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
            <Database className="h-4 w-4" />
            Powered by AGRC + Utah County GIS
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            TaxProperty Utah
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
            Automated intelligence for Utah tax sale investing.
            <span className="text-emerald-600 font-semibold"> Data-driven decisions in seconds.</span>
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mb-16">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6 h-auto gap-2 bg-emerald-600 hover:bg-emerald-700">
              View Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-20">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-1">127</div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Properties Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-1">90</div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Max Score</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-1">$5K</div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Min Bid Range</div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Automated Scoring</h3>
              <p className="text-gray-600">
                Proprietary algorithm analyzes 127 Utah County tax sale properties across 15+ data points.
                Opportunity and risk scores calculated instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Zoning Intelligence</h3>
              <p className="text-gray-600">
                Auto-fill from AGRC parcel data + Utah County zoning identify.
                Municipal zoning guidance for city properties. Buildability scores included.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Redemption Risk Analysis</h3>
              <p className="text-gray-600">
                Automated Land Records scraping detects partial payments, fresh heirs,
                absentee owners. Know redemption risk before you bid.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-emerald-700">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Import</h4>
              <p className="text-sm text-gray-600">County tax sale data imported automatically</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-emerald-700">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Analyze</h4>
              <p className="text-sm text-gray-600">AGRC + zoning + Land Records scraped</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-emerald-700">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Score</h4>
              <p className="text-sm text-gray-600">Risk-adjusted opportunity scores generated</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-emerald-700">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Bid</h4>
              <p className="text-sm text-gray-600">Executive reports for investor decisions</p>
            </div>
          </div>
        </div>

        {/* Demo CTA */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Live Demo: May 21, 2026</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Utah County Tax Sale happening now. See the tool in action with real auction data.
            Filtered from 127 properties to the top 4 investment opportunities.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6 h-auto gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Zap className="h-5 w-5" />
              See Live Dashboard
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>Built for Utah real estate investors. Data sources: Utah County Treasurer, AGRC, Utah County GIS.</p>
          <p className="mt-2">Not financial advice. Verify all data independently.</p>
        </div>
      </div>
    </div>
  )
}

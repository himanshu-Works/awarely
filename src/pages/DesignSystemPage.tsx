import { useState } from 'react'
import {
  MapPin,
  AlertOctagon,
  PlusCircle,
  Users,
  Search,
  ArrowRight,
} from 'lucide-react'
import { AppLayout } from '@/components/design-system/AppLayout'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { Button } from '@/components/design-system/Button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/design-system/Card'
import { Badge } from '@/components/design-system/Badge'
import { StatusIndicator } from '@/components/design-system/StatusIndicator'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { Input } from '@/components/design-system/Input'
import { Select } from '@/components/design-system/Select'
import { Textarea } from '@/components/design-system/Textarea'
import { Alert } from '@/components/design-system/Alert'
import { EmptyState } from '@/components/design-system/EmptyState'
import { CardSkeleton } from '@/components/design-system/Skeleton'
import { Modal } from '@/components/ui/Modal'

export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [btnLoading, setBtnLoading] = useState(false)
  const [sampleInput, setSampleInput] = useState('')
  const [sampleError, setSampleError] = useState('')

  function handleTestSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sampleInput.trim()) {
      setSampleError('This field is required.')
    } else {
      setSampleError('')
      setBtnLoading(true)
      setTimeout(() => setBtnLoading(false), 1200)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-12 pb-16">
        {/* ── Design System Hero Header ─────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-[#1E3550] bg-gradient-to-br from-[#122338] via-[#0B192C] to-[#050B14] p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EB5E28]/15 border border-[#EB5E28]/35 px-3 py-1 text-xs font-semibold text-[#EB5E28]">
                <span>AWARELY VISUAL DESIGN SYSTEM</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Safety, When It Matters.
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                A clean, authentic, and trustworthy design direction: dark navy foundation,
                crisp white/light surfaces, restrained orange accent, and multi-factor
                safety states that always pair color with text, icons, and labels.
              </p>
            </div>

            {/* Official Brand Asset Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-xl flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Official Supplied Brand Asset
              </span>
              <BrandLogo size="lg" />
            </div>
          </div>
        </section>

        {/* ── 1. Color Palette & Semantics ──────────────────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              1. Color Tokens & Brand Palette
            </h2>
            <p className="text-xs text-slate-400">
              Professional dark navy core with light surface pairing and restrained accenting.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-[#1E3550] bg-[#050B14] p-3 space-y-2">
              <div className="h-10 rounded-lg bg-[#050B14] border border-white/10" />
              <div>
                <p className="text-xs font-semibold text-white">Navy Deep</p>
                <p className="text-[10px] text-slate-400 font-mono">#050B14</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1E3550] bg-[#0B192C] p-3 space-y-2">
              <div className="h-10 rounded-lg bg-[#0B192C] border border-white/10" />
              <div>
                <p className="text-xs font-semibold text-white">Brand Navy</p>
                <p className="text-[10px] text-slate-400 font-mono">#0B192C</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1E3550] bg-[#122338] p-3 space-y-2">
              <div className="h-10 rounded-lg bg-[#122338] border border-white/10" />
              <div>
                <p className="text-xs font-semibold text-white">Navy Surface</p>
                <p className="text-[10px] text-slate-400 font-mono">#122338</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EB5E28]/40 bg-[#EB5E28]/10 p-3 space-y-2">
              <div className="h-10 rounded-lg bg-[#EB5E28]" />
              <div>
                <p className="text-xs font-semibold text-[#EB5E28]">Accent Orange</p>
                <p className="text-[10px] text-slate-400 font-mono">#EB5E28</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-3 space-y-2">
              <div className="h-10 rounded-lg bg-white border border-slate-200" />
              <div>
                <p className="text-xs font-semibold text-[#0B192C]">White Surface</p>
                <p className="text-[10px] text-slate-500 font-mono">#FFFFFF</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-slate-100 p-3 space-y-2">
              <div className="h-10 rounded-lg bg-[#F8FAFC] border border-slate-300" />
              <div>
                <p className="text-xs font-semibold text-[#0B192C]">Light Neutral</p>
                <p className="text-[10px] text-slate-500 font-mono">#F8FAFC</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Multi-Factor Safety State Indicators ──────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              2. Safety State Indicators
            </h2>
            <p className="text-xs text-slate-400">
              Crucial: Never relies solely on color. Every condition is strictly backed by text, icons, and labels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusIndicator
              state="positive"
              label="Active Foot Traffic & Illumination"
              description="High community pedestrian volume and open commercial activity reported."
            />
            <StatusIndicator
              state="caution"
              label="Caution Advised (Night/Peripheral)"
              description="Mixed perception observations; comfort varies depending on specific alleys or time."
            />
            <StatusIndicator
              state="concern"
              label="Higher Concern Reported"
              description="Contributors observe low illumination or secluded walkway conditions."
            />
            <StatusIndicator
              state="neutral"
              label="Preliminary Community Observations"
              description="Fewer than 5 submissions recorded. Additional community reports encouraged."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-semibold text-slate-400">Badge Variants:</span>
            <StatusIndicator state="positive" showBadgeOnly />
            <StatusIndicator state="caution" showBadgeOnly />
            <StatusIndicator state="concern" showBadgeOnly />
            <StatusIndicator state="neutral" showBadgeOnly />
          </div>
        </section>

        {/* ── 3. Confidence Indicators ─────────────────────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              3. Data Freshness & Confidence Indicators
            </h2>
            <p className="text-xs text-slate-400">
              Communicates sample volume and empirical reliability to prevent false senses of certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="navy">
              <ConfidenceBadge tier="high" reportCount={48} showDetail />
            </Card>
            <Card variant="navy">
              <ConfidenceBadge tier="moderate" reportCount={14} showDetail />
            </Card>
            <Card variant="navy">
              <ConfidenceBadge tier="low" reportCount={2} showDetail />
            </Card>
          </div>
        </section>

        {/* ── 4. Buttons & Actions ─────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              4. Button Tokens & Action Primitives
            </h2>
            <p className="text-xs text-slate-400">
              Accessible keyboard navigation, visible focus rings, and loading indicators.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" leftIcon={<PlusCircle className="h-4 w-4" />}>
                Contribute Report
              </Button>
              <Button variant="navy" leftIcon={<Users className="h-4 w-4 text-amber-400" />}>
                Trusted Circle
              </Button>
              <Button variant="secondary" leftIcon={<Search className="h-4 w-4" />}>
                Search Area
              </Button>
              <Button variant="light">Light Surface Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger" leftIcon={<AlertOctagon className="h-4 w-4" />}>
                Trigger Distress Alarm
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="text-xs text-slate-400 font-semibold">Sizes & States:</span>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Large Action
              </Button>
              <Button variant="primary" isLoading>Processing</Button>
              <Button variant="primary" disabled>Disabled State</Button>
            </div>
          </div>
        </section>

        {/* ── 5. Dark Navy & White/Light Surface Cards ──────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              5. Surface Cards (Dark Navy & Crisp White)
            </h2>
            <p className="text-xs text-slate-400">
              Demonstrating visual fidelity on both dark navy and crisp white light surfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dark Navy Surface Card */}
            <Card variant="navy">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="orange" dot>Dark Navy Surface</Badge>
                  <span className="text-xs text-slate-400">Colaba & Gateway</span>
                </div>
                <CardTitle>Community Observation Summary</CardTitle>
                <CardDescription>
                  Rendered on dark navy surface (#122338) with slate borders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Well-lit waterfront with regular pedestrian activity and open cafes.
                  Commercial lighting remains active past 10 PM.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Badge variant="default">Well-lit</Badge>
                  <Badge variant="default">High foot traffic</Badge>
                  <Badge variant="default">Police booth nearby</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-slate-400">Updated 18m ago</span>
                <Button variant="primary" size="sm">Explore Area</Button>
              </CardFooter>
            </Card>

            {/* Crisp White / Light Surface Card */}
            <Card variant="white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="navy">White Surface Variant</Badge>
                  <span className="text-xs text-slate-500">Bandra West</span>
                </div>
                <CardTitle className="text-[#0B192C]">Daylight Activity Profile</CardTitle>
                <CardDescription className="text-slate-500">
                  Rendered on crisp white surface (#FFFFFF) with high contrast deep navy typography.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Active seaside promenade with steady footfall throughout evening hours.
                  Pedestrian walkways are clearly delineated from vehicle traffic.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-800 font-medium border border-slate-200">
                    High foot traffic
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-800 font-medium border border-slate-200">
                    Open businesses
                  </span>
                </div>
              </CardContent>
              <CardFooter className="border-slate-200">
                <span className="text-xs text-slate-500">95% Day Comfort</span>
                <Button variant="navy" size="sm">Inspect Reports</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* ── 6. Form Controls & Inputs ─────────────────────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              6. Accessible Form Controls
            </h2>
            <p className="text-xs text-slate-400">
              Explicit label association, ARIA validation attributes, and restrained orange focus rings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="navy">
              <form onSubmit={handleTestSubmit} className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Dark Surface Inputs</h3>
                <Input
                  label="Area Location Name"
                  placeholder="e.g. Connaught Place"
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  error={sampleError}
                  hint="Type any text to test validation state."
                  leftIcon={<MapPin className="h-4 w-4" />}
                />

                <Select
                  label="Observed Time Window"
                  options={[
                    { value: 'morning', label: 'Morning (06:00 – 12:00)' },
                    { value: 'afternoon', label: 'Afternoon (12:00 – 18:00)' },
                    { value: 'evening', label: 'Evening (18:00 – 22:00)' },
                    { value: 'night', label: 'Night (22:00 – 06:00)' },
                  ]}
                />

                <Textarea
                  label="Community Observation Notes"
                  placeholder="Share details regarding lighting, activity, or commercial presence…"
                  rows={2}
                />

                <Button type="submit" variant="primary" isLoading={btnLoading}>
                  Validate & Submit
                </Button>
              </form>
            </Card>

            <Card variant="white">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#0B192C]">Light Surface Inputs</h3>
                <Input
                  surface="light"
                  label="Tourist Identifier / Alias"
                  placeholder="e.g. SoloTraveler24"
                  hint="Anonymous handle shown to community."
                  leftIcon={<Users className="h-4 w-4" />}
                />

                <Select
                  surface="light"
                  label="Perception Rating"
                  options={[
                    { value: 'comfortable', label: 'Felt Comfortable' },
                    { value: 'mixed', label: 'Mixed Conditions' },
                    { value: 'caution', label: 'Caution Advised' },
                  ]}
                />

                <Textarea
                  surface="light"
                  label="Optional Notes"
                  placeholder="Light surface input styling..."
                  rows={2}
                />
              </div>
            </Card>
          </div>
        </section>

        {/* ── 7. Alerts, Modals & Loading States ───────────────────────── */}
        <section className="space-y-4">
          <div className="border-b border-[#1E3550] pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              7. Alerts, Dialogs & Loading Placeholders
            </h2>
            <p className="text-xs text-slate-400">
              Accessible modals with keyboard focus management and reduced-motion safe skeleton loaders.
            </p>
          </div>

          <div className="space-y-3">
            <Alert
              type="info"
              title="Privacy-First Area Protocol"
              description="Awarely never tracks or saves continuous GPS coordinates. Location is queried ephemerally for area boundary resolution only."
            />
            <Alert
              type="caution"
              title="Nighttime Caution Advisory"
              description="Contributors advise sticking to illuminated thoroughfares near market exits after 10 PM."
            />
            <Alert
              type="concern"
              title="Reduced Illumination Notice"
              description="Multiple reports indicate dimmed street lighting along secondary lanes."
            />
            <Alert
              type="positive"
              title="High Foot Traffic Confirmed"
              description="Active community presence and reliable transport links reported across the central hub."
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <Button
              variant="primary"
              onClick={() => setModalOpen(true)}
            >
              Open Accessible Modal Dialog
            </Button>

            <Button
              variant="secondary"
              onClick={() => alert('Empty state demo below')}
            >
              Inspect Skeletons Below
            </Button>
          </div>

          {/* Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <CardSkeleton />
            <EmptyState
              title="No Reports in this Area Yet"
              description="Be the first contributor to record pedestrian density and illumination feedback."
              action={
                <Button variant="primary" size="sm">
                  Add First Report
                </Button>
              }
            />
          </div>
        </section>

        {/* ── Accessible Modal Component Test ───────────────────────────── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Accessible Dialog Component"
          description="Supports keyboard ESC key, backdrop blur, focus lock, and ARIA dialog roles."
        >
          <div className="space-y-4 text-left">
            <Alert
              type="info"
              title="Keyboard Accessible"
              description="Press ESC on your keyboard or click outside to dismiss."
            />
            <Input
              label="Modal Input Field"
              placeholder="Focus is trapped within the active dialog."
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm Action
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}

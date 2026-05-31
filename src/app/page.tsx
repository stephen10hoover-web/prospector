import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { TrustBar } from '@/components/landing/TrustBar'
import { ProductShowcase } from '@/components/landing/ProductShowcase'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Testimonials } from '@/components/landing/Testimonials'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'

export default async function Home() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div style={{ background: '#09090b' }}>
      <LandingNav />
      <main>
        <Hero />
        <TrustBar />
        <ProductShowcase />
        <Features />
        <HowItWorks />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

import type { RawBusiness } from '@/types'

interface SerpApiResult {
  title: string
  type: string
  address: string
  phone?: string
  website?: string
  rating?: number
  reviews?: number
  place_id_search?: string
}

function parseCity(address: string): { city: string; state: string } {
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || parts[0]
    const stateZip = parts[parts.length - 2] || ''
    const state = stateZip.trim().split(' ')[0] || ''
    return { city, state }
  }
  if (parts.length === 2) {
    return { city: parts[0], state: parts[1].split(' ')[0] || '' }
  }
  return { city: address, state: '' }
}

const MOCK_BUSINESSES: RawBusiness[] = [
  {
    name: 'Austin Premium Roofing',
    category: 'Roofers',
    address: '1234 Congress Ave, Austin, TX 78701',
    city: 'Austin',
    state: 'TX',
    phone: '(512) 555-0101',
    website_url: null,
    google_maps_url: 'https://maps.google.com/?q=Austin+Premium+Roofing',
    review_count: 87,
    rating: 4.7,
  },
  {
    name: 'Green Thumb Landscaping',
    category: 'Landscapers',
    address: '5678 Lamar Blvd, Austin, TX 78751',
    city: 'Austin',
    state: 'TX',
    phone: '(512) 555-0202',
    website_url: 'http://greenthumbaustin.com',
    google_maps_url: 'https://maps.google.com/?q=Green+Thumb+Landscaping+Austin',
    review_count: 43,
    rating: 4.3,
  },
  {
    name: 'Glow Med Spa Austin',
    category: 'Med Spas',
    address: '910 South Lamar Blvd, Austin, TX 78704',
    city: 'Austin',
    state: 'TX',
    phone: '(512) 555-0303',
    website_url: 'https://glowmedspa.com',
    google_maps_url: 'https://maps.google.com/?q=Glow+Med+Spa+Austin',
    review_count: 156,
    rating: 4.8,
  },
  {
    name: 'Capitol City Hair Salon',
    category: 'Salons',
    address: '321 E 6th St, Austin, TX 78701',
    city: 'Austin',
    state: 'TX',
    phone: '(512) 555-0404',
    website_url: null,
    google_maps_url: 'https://maps.google.com/?q=Capitol+City+Hair+Salon',
    review_count: 62,
    rating: 4.5,
  },
  {
    name: 'Texas Elite General Contractors',
    category: 'General Contractors',
    address: '789 Ben White Blvd, Austin, TX 78748',
    city: 'Austin',
    state: 'TX',
    phone: '(512) 555-0505',
    website_url: 'http://texaselitecontractors.net',
    google_maps_url: 'https://maps.google.com/?q=Texas+Elite+General+Contractors',
    review_count: 28,
    rating: 4.2,
  },
]

export async function searchBusinesses(params: {
  category: string
  location: string
  radius: number
}): Promise<RawBusiness[]> {
  const { category, location, radius } = params
  const apiKey = process.env.SERP_API_KEY

  console.log('[business-discovery] SERP_API_KEY present:', !!apiKey)
  console.log('[business-discovery] Key prefix:', apiKey?.slice(0, 5))

  if (!apiKey) {
    console.warn('[business-discovery] SERP_API_KEY not set. Using mock data.')
    return MOCK_BUSINESSES.map((biz) => ({
      ...biz,
      category,
      city: location.split(',')[0]?.trim() ?? biz.city,
      state: location.split(',')[1]?.trim() ?? biz.state,
    }))
  }

  const query = `${category} near ${location}`
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google_maps')
  url.searchParams.set('q', query)
  url.searchParams.set('location', location)
  url.searchParams.set('radius', String(radius * 1609))
  url.searchParams.set('hl', 'en')
  url.searchParams.set('api_key', apiKey)

  console.log('[business-discovery] Calling SerpAPI:', query)

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 0 },
    })

    console.log('[business-discovery] SerpAPI response status:', response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error('[business-discovery] SerpAPI error:', response.status, text)
      return MOCK_BUSINESSES
    }

    const data = await response.json()
    console.log('[business-discovery] local_results count:', data.local_results?.length ?? 0)
    const results: SerpApiResult[] = data.local_results ?? []

    return results
      .filter((r) => r.title && r.address)
      .map((r) => {
        const { city, state } = parseCity(r.address)
        return {
          name: r.title,
          category: r.type || category,
          address: r.address,
          city,
          state,
          phone: r.phone ?? null,
          website_url: r.website ?? null,
          google_maps_url: r.place_id_search ?? null,
          review_count: r.reviews ?? 0,
          rating: r.rating ?? 0,
        }
      })
      .slice(0, 20)
  } catch (error) {
    console.error('[business-discovery] Fetch error:', error)
    return MOCK_BUSINESSES
  }
}

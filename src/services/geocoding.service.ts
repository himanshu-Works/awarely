/**
 * Geocoding & Places Service for Awarely.
 *
 * Implements:
 * 1. Worldwide Google Places Autocomplete & Geocoding discovery.
 * 2. Elevation of street-level & landmark searches to broader containing areas
 *    (neighborhood, locality, sublocality, city).
 * 3. Canonical Area ID derivation and Firestore lookup.
 * 4. Zero-fabrication unreported area generation (no fabricated scores,
 *    no fabricated confidence, no fabricated AI summaries).
 * 5. Resilient offline/test catalog supporting global benchmark cities.
 */

import {
  generateCanonicalAreaId,
  isRoadLevelEntity,
  createUnreportedArea,
  extractGeographicComponents,
  type GeographicComponents,
} from '@/utils/area-resolution'
import type { Area, AreaBounds } from '@/types/area'
import { firestoreService } from '@/services/firestore.service'
import { SEED_AREAS } from '@/data/seedAreas'
import { geoapifyService, isGeoapifyConfigured } from '@/services/geoapify.service'

export interface AreaSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  areaType: 'neighborhood' | 'locality' | 'market' | 'station' | 'chowk' | 'district' | 'road'
  isRoad: boolean
  containingAreaHint?: string
  coordinates?: { lat: number; lng: number }
  bounds?: AreaBounds
  resolutionSource?: string
  fallbackUsed?: boolean
}

/**
 * High-fidelity global reference catalog for testing, offline resilience, and
 * road elevation benchmarks across Indian and international metros.
 */
const SEED_SEARCH_CATALOG: AreaSuggestion[] = [
  // ── India Metros: Lucknow, Kanpur, Jaipur, Bengaluru, Mumbai, Delhi ──
  {
    placeId: 'cat-in-lucknow-gomti-nagar',
    mainText: 'Gomti Nagar',
    secondaryText: 'Lucknow, Uttar Pradesh, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 26.85, lng: 80.99 },
    bounds: {
      northEast: { latitude: 26.87, longitude: 81.01 },
      southWest: { latitude: 26.83, longitude: 80.97 },
    },
  },
  {
    placeId: 'cat-in-lucknow-hazratganj',
    mainText: 'Hazratganj',
    secondaryText: 'Lucknow, Uttar Pradesh, India',
    areaType: 'market',
    isRoad: false,
    coordinates: { lat: 26.853, lng: 80.945 },
    bounds: {
      northEast: { latitude: 26.86, longitude: 80.955 },
      southWest: { latitude: 26.845, longitude: 80.935 },
    },
  },
  {
    placeId: 'cat-in-lucknow-chinhat-bbditm',
    mainText: 'Chinhat',
    secondaryText: 'Lucknow, Uttar Pradesh, India',
    containingAreaHint: 'Chinhat, Lucknow',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 26.89, lng: 81.06 },
    bounds: {
      northEast: { latitude: 26.91, longitude: 81.08 },
      southWest: { latitude: 26.87, longitude: 81.04 },
    },
  },
  {
    placeId: 'cat-in-kanpur-swaroop-nagar',
    mainText: 'Swaroop Nagar',
    secondaryText: 'Kanpur, Uttar Pradesh, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 26.475, lng: 80.32 },
    bounds: {
      northEast: { latitude: 26.485, longitude: 80.332 },
      southWest: { latitude: 26.465, longitude: 80.308 },
    },
  },
  {
    placeId: 'cat-in-kanpur-civil-lines',
    mainText: 'Civil Lines',
    secondaryText: 'Kanpur, Uttar Pradesh, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 26.468, lng: 80.349 },
    bounds: {
      northEast: { latitude: 26.48, longitude: 80.36 },
      southWest: { latitude: 26.455, longitude: 80.338 },
    },
  },
  {
    placeId: 'cat-in-jaipur-c-scheme',
    mainText: 'C-Scheme',
    secondaryText: 'Jaipur, Rajasthan, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 26.911, lng: 75.801 },
    bounds: {
      northEast: { latitude: 26.92, longitude: 75.812 },
      southWest: { latitude: 26.9, longitude: 75.79 },
    },
  },
  {
    placeId: 'cat-in-jaipur-malviya-nagar',
    mainText: 'Malviya Nagar',
    secondaryText: 'Jaipur, Rajasthan, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 26.853, lng: 75.818 },
    bounds: {
      northEast: { latitude: 26.865, longitude: 75.83 },
      southWest: { latitude: 26.84, longitude: 75.805 },
    },
  },
  {
    placeId: 'cat-in-bengaluru-indiranagar',
    mainText: 'Indiranagar',
    secondaryText: 'Bengaluru, Karnataka, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 12.978, lng: 77.64 },
    bounds: {
      northEast: { latitude: 12.99, longitude: 77.655 },
      southWest: { latitude: 12.965, longitude: 77.625 },
    },
  },
  {
    placeId: 'cat-in-bengaluru-koramangala',
    mainText: 'Koramangala',
    secondaryText: 'Bengaluru, Karnataka, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 12.935, lng: 77.624 },
    bounds: {
      northEast: { latitude: 12.95, longitude: 77.64 },
      southWest: { latitude: 12.92, longitude: 77.61 },
    },
  },
  {
    placeId: 'cat-mumbai-colaba',
    mainText: 'Colaba & Gateway Promenade',
    secondaryText: 'Mumbai, Maharashtra, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 18.922, lng: 72.83 },
    bounds: {
      northEast: { latitude: 18.928, longitude: 72.836 },
      southWest: { latitude: 18.915, longitude: 72.824 },
    },
  },
  {
    placeId: 'cat-mumbai-bandra-west',
    mainText: 'Bandra West',
    secondaryText: 'Mumbai, Maharashtra, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 19.064, lng: 72.826 },
    bounds: {
      northEast: { latitude: 19.072, longitude: 72.835 },
      southWest: { latitude: 19.055, longitude: 72.818 },
    },
  },
  {
    placeId: 'cat-mumbai-pali-hill',
    mainText: 'Pali Hill',
    secondaryText: 'Bandra West, Mumbai, India',
    areaType: 'neighborhood',
    isRoad: false,
    containingAreaHint: 'Bandra West',
    coordinates: { lat: 19.066, lng: 72.828 },
    bounds: {
      northEast: { latitude: 19.072, longitude: 72.835 },
      southWest: { latitude: 19.055, longitude: 72.818 },
    },
  },
  {
    placeId: 'cat-delhi-cp',
    mainText: 'Connaught Place',
    secondaryText: 'New Delhi, Delhi, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 28.631, lng: 77.218 },
    bounds: {
      northEast: { latitude: 28.636, longitude: 77.225 },
      southWest: { latitude: 28.625, longitude: 77.211 },
    },
  },
  {
    placeId: 'cat-delhi-hauz-khas',
    mainText: 'Hauz Khas Village',
    secondaryText: 'South Delhi, New Delhi, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 28.552, lng: 77.196 },
    bounds: {
      northEast: { latitude: 28.558, longitude: 77.202 },
      southWest: { latitude: 28.547, longitude: 77.191 },
    },
  },
  {
    placeId: 'cat-in-hyderabad-hitec-city',
    mainText: 'HITEC City',
    secondaryText: 'Hyderabad, Telangana, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 17.4474, lng: 78.3762 },
    bounds: {
      northEast: { latitude: 17.46, longitude: 78.39 },
      southWest: { latitude: 17.43, longitude: 78.36 },
    },
  },
  {
    placeId: 'cat-in-hyderabad-banjara-hills',
    mainText: 'Banjara Hills',
    secondaryText: 'Hyderabad, Telangana, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 17.4156, lng: 78.4357 },
    bounds: {
      northEast: { latitude: 17.43, longitude: 78.45 },
      southWest: { latitude: 17.4, longitude: 78.42 },
    },
  },
  {
    placeId: 'cat-in-pune-koregaon-park',
    mainText: 'Koregaon Park',
    secondaryText: 'Pune, Maharashtra, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 18.5362, lng: 73.894 },
    bounds: {
      northEast: { latitude: 18.545, longitude: 73.905 },
      southWest: { latitude: 18.525, longitude: 73.88 },
    },
  },
  {
    placeId: 'cat-in-pune-shivaji-nagar',
    mainText: 'Shivaji Nagar',
    secondaryText: 'Pune, Maharashtra, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 18.5314, lng: 73.8446 },
    bounds: {
      northEast: { latitude: 18.545, longitude: 73.86 },
      southWest: { latitude: 18.515, longitude: 73.83 },
    },
  },
  {
    placeId: 'cat-in-chennai-t-nagar',
    mainText: 'T. Nagar',
    secondaryText: 'Chennai, Tamil Nadu, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 13.0418, lng: 80.2341 },
    bounds: {
      northEast: { latitude: 13.055, longitude: 73.86 },
      southWest: { latitude: 13.03, longitude: 80.22 },
    },
  },
  {
    placeId: 'cat-in-chennai-mylapore',
    mainText: 'Mylapore',
    secondaryText: 'Chennai, Tamil Nadu, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 13.0368, lng: 80.2676 },
    bounds: {
      northEast: { latitude: 13.05, longitude: 80.28 },
      southWest: { latitude: 13.02, longitude: 80.25 },
    },
  },
  {
    placeId: 'cat-in-kolkata-park-street',
    mainText: 'Park Street',
    secondaryText: 'Kolkata, West Bengal, India',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 22.551, lng: 88.353 },
    bounds: {
      northEast: { latitude: 22.56, longitude: 88.365 },
      southWest: { latitude: 22.54, longitude: 88.34 },
    },
  },
  {
    placeId: 'cat-in-kolkata-salt-lake',
    mainText: 'Salt Lake Sector V',
    secondaryText: 'Kolkata, West Bengal, India',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 22.5804, lng: 88.4378 },
    bounds: {
      northEast: { latitude: 22.595, longitude: 88.455 },
      southWest: { latitude: 22.565, longitude: 88.42 },
    },
  },

  // ── International Metros: London, Tokyo, Paris, New York, Sydney, São Paulo, Cape Town ──
  {
    placeId: 'cat-london-soho',
    mainText: 'Soho & West End',
    secondaryText: 'City of Westminster, London, UK',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 51.513, lng: -0.132 },
    bounds: {
      northEast: { latitude: 51.516, longitude: -0.126 },
      southWest: { latitude: 51.511, longitude: -0.138 },
    },
  },
  {
    placeId: 'cat-london-covent-garden',
    mainText: 'Covent Garden',
    secondaryText: 'London, UK',
    areaType: 'neighborhood',
    isRoad: false,
    containingAreaHint: 'Soho & Covent Garden',
    coordinates: { lat: 51.511, lng: -0.124 },
    bounds: {
      northEast: { latitude: 51.516, longitude: -0.126 },
      southWest: { latitude: 51.511, longitude: -0.138 },
    },
  },
  {
    placeId: 'cat-jp-tokyo-shinjuku',
    mainText: 'Shinjuku',
    secondaryText: 'Tokyo, Japan',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 35.6938, lng: 139.7034 },
    bounds: {
      northEast: { latitude: 35.705, longitude: 139.72 },
      southWest: { latitude: 35.68, longitude: 139.69 },
    },
  },
  {
    placeId: 'cat-jp-tokyo-shibuya',
    mainText: 'Shibuya',
    secondaryText: 'Tokyo, Japan',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 35.658, lng: 139.7016 },
    bounds: {
      northEast: { latitude: 35.67, longitude: 139.715 },
      southWest: { latitude: 35.645, longitude: 139.688 },
    },
  },
  {
    placeId: 'cat-fr-paris-le-marais',
    mainText: 'Le Marais',
    secondaryText: 'Paris, Île-de-France, France',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 48.8575, lng: 2.358 },
    bounds: {
      northEast: { latitude: 48.865, longitude: 2.37 },
      southWest: { latitude: 48.85, longitude: 2.345 },
    },
  },
  {
    placeId: 'cat-fr-paris-montmartre',
    mainText: 'Montmartre',
    secondaryText: '18th Arrondissement, Paris, France',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 48.8867, lng: 2.3431 },
    bounds: {
      northEast: { latitude: 48.895, longitude: 2.355 },
      southWest: { latitude: 48.878, longitude: 2.33 },
    },
  },
  {
    placeId: 'cat-us-newyork-manhattan',
    mainText: 'Manhattan Midtown',
    secondaryText: 'New York, NY, United States',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 40.758, lng: -73.9855 },
    bounds: {
      northEast: { latitude: 40.77, longitude: -73.97 },
      southWest: { latitude: 40.745, longitude: -74.0 },
    },
  },
  {
    placeId: 'cat-us-newyork-brooklyn',
    mainText: 'Williamsburg',
    secondaryText: 'Brooklyn, New York, NY, United States',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 40.7081, lng: -73.9571 },
    bounds: {
      northEast: { latitude: 40.72, longitude: -73.94 },
      southWest: { latitude: 40.695, longitude: -73.97 },
    },
  },
  {
    placeId: 'cat-au-sydney-surry-hills',
    mainText: 'Surry Hills',
    secondaryText: 'Sydney, New South Wales, Australia',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -33.886, lng: 151.211 },
    bounds: {
      northEast: { latitude: -33.875, longitude: 151.225 },
      southWest: { latitude: -33.898, longitude: 151.2 },
    },
  },
  {
    placeId: 'cat-br-saopaulo-jardins',
    mainText: 'Jardins',
    secondaryText: 'São Paulo, SP, Brazil',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -23.565, lng: -46.666 },
    bounds: {
      northEast: { latitude: -23.555, longitude: -46.65 },
      southWest: { latitude: -23.578, longitude: -46.68 },
    },
  },
  {
    placeId: 'cat-za-capetown-citybowl',
    mainText: 'City Bowl',
    secondaryText: 'Cape Town, Western Cape, South Africa',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: -33.9249, lng: 18.4241 },
    bounds: {
      northEast: { latitude: -33.91, longitude: 18.44 },
      southWest: { latitude: -33.94, longitude: 18.41 },
    },
  },
  {
    placeId: 'cat-sg-singapore-marina-bay',
    mainText: 'Marina Bay',
    secondaryText: 'Downtown Core, Singapore',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 1.284, lng: 103.861 },
    bounds: {
      northEast: { latitude: 1.295, longitude: 103.87 },
      southWest: { latitude: 1.275, longitude: 103.85 },
    },
  },
  {
    placeId: 'cat-sg-singapore-orchard',
    mainText: 'Orchard Road',
    secondaryText: 'Central Region, Singapore',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 1.3048, lng: 103.8318 },
    bounds: {
      northEast: { latitude: 1.315, longitude: 103.84 },
      southWest: { latitude: 1.295, longitude: 103.82 },
    },
  },
  {
    placeId: 'cat-th-bangkok-sukhumvit',
    mainText: 'Sukhumvit',
    secondaryText: 'Bangkok, Thailand',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 13.738, lng: 100.56 },
    bounds: {
      northEast: { latitude: 13.75, longitude: 100.58 },
      southWest: { latitude: 13.72, longitude: 100.54 },
    },
  },
  {
    placeId: 'cat-th-bangkok-siam',
    mainText: 'Siam',
    secondaryText: 'Pathum Wan, Bangkok, Thailand',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 13.746, lng: 100.534 },
    bounds: {
      northEast: { latitude: 13.755, longitude: 100.545 },
      southWest: { latitude: 13.735, longitude: 100.52 },
    },
  },
  {
    placeId: 'cat-ae-dubai-downtown',
    mainText: 'Downtown Dubai',
    secondaryText: 'Dubai, United Arab Emirates',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 25.1972, lng: 55.2744 },
    bounds: {
      northEast: { latitude: 25.21, longitude: 55.29 },
      southWest: { latitude: 25.18, longitude: 55.26 },
    },
  },
  {
    placeId: 'cat-ae-dubai-marina',
    mainText: 'Dubai Marina',
    secondaryText: 'Dubai, United Arab Emirates',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 25.0805, lng: 55.1403 },
    bounds: {
      northEast: { latitude: 25.095, longitude: 55.155 },
      southWest: { latitude: 25.065, longitude: 55.125 },
    },
  },
  {
    placeId: 'cat-de-berlin-mitte',
    mainText: 'Mitte',
    secondaryText: 'Berlin, Germany',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 52.52, lng: 13.405 },
    bounds: {
      northEast: { latitude: 52.535, longitude: 13.42 },
      southWest: { latitude: 52.505, longitude: 13.39 },
    },
  },
  {
    placeId: 'cat-de-berlin-kreuzberg',
    mainText: 'Kreuzberg',
    secondaryText: 'Berlin, Germany',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 52.498, lng: 13.403 },
    bounds: {
      northEast: { latitude: 52.51, longitude: 13.42 },
      southWest: { latitude: 52.485, longitude: 13.385 },
    },
  },
  {
    placeId: 'cat-nl-amsterdam-jordaan',
    mainText: 'Jordaan',
    secondaryText: 'Amsterdam, North Holland, Netherlands',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 52.375, lng: 4.882 },
    bounds: {
      northEast: { latitude: 52.385, longitude: 4.895 },
      southWest: { latitude: 52.365, longitude: 4.87 },
    },
  },
  {
    placeId: 'cat-nl-amsterdam-de-pijp',
    mainText: 'De Pijp',
    secondaryText: 'Amsterdam, Netherlands',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 52.353, lng: 4.897 },
    bounds: {
      northEast: { latitude: 52.365, longitude: 4.91 },
      southWest: { latitude: 52.34, longitude: 4.885 },
    },
  },
  {
    placeId: 'cat-ca-toronto-downtown',
    mainText: 'Downtown Toronto',
    secondaryText: 'Toronto, Ontario, Canada',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 43.6532, lng: -79.3832 },
    bounds: {
      northEast: { latitude: 43.665, longitude: -79.37 },
      southWest: { latitude: 43.64, longitude: -79.4 },
    },
  },
  {
    placeId: 'cat-ca-toronto-queen-west',
    mainText: 'Queen Street West',
    secondaryText: 'Toronto, Ontario, Canada',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: 43.648, lng: -79.405 },
    bounds: {
      northEast: { latitude: 43.658, longitude: -79.39 },
      southWest: { latitude: 43.638, longitude: -79.42 },
    },
  },
  {
    placeId: 'cat-us-losangeles-santamonica',
    mainText: 'Santa Monica',
    secondaryText: 'Los Angeles County, CA, United States',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 34.0195, lng: -118.4912 },
    bounds: {
      northEast: { latitude: 34.04, longitude: -118.47 },
      southWest: { latitude: 34.0, longitude: -118.51 },
    },
  },
  {
    placeId: 'cat-us-losangeles-dtla',
    mainText: 'Downtown Los Angeles',
    secondaryText: 'Los Angeles, CA, United States',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: 34.0407, lng: -118.2468 },
    bounds: {
      northEast: { latitude: 34.06, longitude: -118.23 },
      southWest: { latitude: 34.02, longitude: -118.26 },
    },
  },
  {
    placeId: 'cat-ar-buenosaires-palermo',
    mainText: 'Palermo',
    secondaryText: 'Buenos Aires, Argentina',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -34.5889, lng: -58.4306 },
    bounds: {
      northEast: { latitude: -34.57, longitude: -58.41 },
      southWest: { latitude: -34.61, longitude: -58.45 },
    },
  },
  {
    placeId: 'cat-ar-buenosaires-recoleta',
    mainText: 'Recoleta',
    secondaryText: 'Buenos Aires, Argentina',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -34.5875, lng: -58.3975 },
    bounds: {
      northEast: { latitude: -34.575, longitude: -58.38 },
      southWest: { latitude: -34.6, longitude: -58.41 },
    },
  },
  {
    placeId: 'cat-ke-nairobi-westlands',
    mainText: 'Westlands',
    secondaryText: 'Nairobi, Kenya',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -1.2683, lng: 36.8044 },
    bounds: {
      northEast: { latitude: -1.255, longitude: 36.82 },
      southWest: { latitude: -1.28, longitude: 36.79 },
    },
  },
  {
    placeId: 'cat-ke-nairobi-kilimani',
    mainText: 'Kilimani',
    secondaryText: 'Nairobi, Kenya',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -1.295, lng: 36.785 },
    bounds: {
      northEast: { latitude: -1.28, longitude: 36.8 },
      southWest: { latitude: -1.31, longitude: 36.77 },
    },
  },
  {
    placeId: 'cat-au-melbourne-cbd',
    mainText: 'Melbourne CBD',
    secondaryText: 'Melbourne, Victoria, Australia',
    areaType: 'locality',
    isRoad: false,
    coordinates: { lat: -37.8136, lng: 144.9631 },
    bounds: {
      northEast: { latitude: -37.8, longitude: 144.98 },
      southWest: { latitude: -37.825, longitude: 144.95 },
    },
  },
  {
    placeId: 'cat-au-melbourne-fitzroy',
    mainText: 'Fitzroy',
    secondaryText: 'Melbourne, Victoria, Australia',
    areaType: 'neighborhood',
    isRoad: false,
    coordinates: { lat: -37.8015, lng: 144.9785 },
    bounds: {
      northEast: { latitude: -37.79, longitude: 144.99 },
      southWest: { latitude: -37.815, longitude: 144.965 },
    },
  },

  // ── Stations, Chowks & Markets ──────────────────────────────────────
  {
    placeId: 'cat-station-csmt',
    mainText: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    secondaryText: 'Fort, Mumbai, Maharashtra, India',
    areaType: 'station',
    isRoad: false,
    coordinates: { lat: 18.9401, lng: 72.8353 },
    bounds: {
      northEast: { latitude: 18.945, longitude: 72.84 },
      southWest: { latitude: 18.935, longitude: 72.83 },
    },
  },
  {
    placeId: 'cat-station-ndls',
    mainText: 'New Delhi Railway Station',
    secondaryText: 'Paharganj, New Delhi, Delhi, India',
    areaType: 'station',
    isRoad: false,
    coordinates: { lat: 28.6429, lng: 77.2195 },
    bounds: {
      northEast: { latitude: 28.65, longitude: 77.225 },
      southWest: { latitude: 28.635, longitude: 77.21 },
    },
  },
  {
    placeId: 'cat-station-shinjuku',
    mainText: 'Shinjuku Station',
    secondaryText: 'Tokyo, Japan',
    areaType: 'station',
    isRoad: false,
    coordinates: { lat: 35.6896, lng: 139.7006 },
    bounds: {
      northEast: { latitude: 35.695, longitude: 139.705 },
      southWest: { latitude: 35.685, longitude: 139.695 },
    },
  },
  {
    placeId: 'cat-chowk-chandni-chowk',
    mainText: 'Chandni Chowk',
    secondaryText: 'Old Delhi, Delhi, India',
    areaType: 'chowk',
    isRoad: false,
    coordinates: { lat: 28.6506, lng: 77.2303 },
    bounds: {
      northEast: { latitude: 28.656, longitude: 77.238 },
      southWest: { latitude: 28.645, longitude: 77.22 },
    },
  },
  {
    placeId: 'cat-chowk-flora-fountain',
    mainText: 'Flora Fountain Chowk (Hutatma Chowk)',
    secondaryText: 'Fort, Mumbai, Maharashtra, India',
    areaType: 'chowk',
    isRoad: false,
    coordinates: { lat: 18.9322, lng: 72.8315 },
    bounds: {
      northEast: { latitude: 18.936, longitude: 72.835 },
      southWest: { latitude: 18.928, longitude: 72.828 },
    },
  },
  {
    placeId: 'cat-market-crawford',
    mainText: 'Crawford Market (Mahatma Jyotiba Phule Mandai)',
    secondaryText: 'Dhobi Talao, Mumbai, Maharashtra, India',
    areaType: 'market',
    isRoad: false,
    coordinates: { lat: 18.9472, lng: 72.8344 },
    bounds: {
      northEast: { latitude: 18.952, longitude: 72.838 },
      southWest: { latitude: 18.942, longitude: 72.83 },
    },
  },
  {
    placeId: 'cat-market-chatuchak',
    mainText: 'Chatuchak Weekend Market',
    secondaryText: 'Kamphaeng Phet 2 Rd, Chatuchak, Bangkok, Thailand',
    areaType: 'market',
    isRoad: false,
    coordinates: { lat: 13.7999, lng: 100.5502 },
    bounds: {
      northEast: { latitude: 13.805, longitude: 100.555 },
      southWest: { latitude: 13.795, longitude: 100.545 },
    },
  },
  {
    placeId: 'cat-road-mg-road-blr',
    mainText: 'MG Road',
    secondaryText: 'Street in Bengaluru Central, Karnataka, India',
    areaType: 'road',
    isRoad: true,
    containingAreaHint: 'Bengaluru Central',
    coordinates: { lat: 12.9756, lng: 77.6066 },
    bounds: {
      northEast: { latitude: 12.985, longitude: 77.62 },
      southWest: { latitude: 12.965, longitude: 77.59 },
    },
  },
  {
    placeId: 'cat-landmark-burj-khalifa',
    mainText: 'Burj Khalifa',
    secondaryText: 'Landmark in Downtown Dubai, UAE',
    areaType: 'locality',
    isRoad: false,
    containingAreaHint: 'Downtown Dubai',
    coordinates: { lat: 25.1972, lng: 55.2744 },
    bounds: {
      northEast: { latitude: 25.205, longitude: 55.285 },
      southWest: { latitude: 25.19, longitude: 55.265 },
    },
  },
  {
    placeId: 'cat-landmark-sydney-opera',
    mainText: 'Sydney Opera House',
    secondaryText: 'Bennelong Point, Sydney, NSW, Australia',
    areaType: 'locality',
    isRoad: false,
    containingAreaHint: 'Sydney',
    coordinates: { lat: -33.8568, lng: 151.2153 },
    bounds: {
      northEast: { latitude: -33.85, longitude: 151.22 },
      southWest: { latitude: -33.865, longitude: 151.21 },
    },
  },

  // ── Postal Areas ────────────────────────────────────────────────────
  {
    placeId: 'cat-postal-in-110001',
    mainText: '110001 (Connaught Place Postal Zone)',
    secondaryText: 'New Delhi, Delhi, India',
    areaType: 'district',
    isRoad: false,
    coordinates: { lat: 28.632, lng: 77.219 },
    bounds: {
      northEast: { latitude: 28.645, longitude: 77.235 },
      southWest: { latitude: 28.62, longitude: 77.205 },
    },
  },
  {
    placeId: 'cat-postal-gb-w1d',
    mainText: 'W1D (Soho Postal District)',
    secondaryText: 'City of Westminster, London, UK',
    areaType: 'district',
    isRoad: false,
    coordinates: { lat: 51.513, lng: -0.133 },
    bounds: {
      northEast: { latitude: 51.518, longitude: -0.125 },
      southWest: { latitude: 51.508, longitude: -0.14 },
    },
  },

  // ── Landmarks / Places (Demonstrates Landmark-to-Area Elevation) ────
  {
    placeId: 'cat-landmark-gateway-of-india',
    mainText: 'Gateway of India',
    secondaryText: 'Point of Interest in Colaba, Mumbai, India',
    areaType: 'locality',
    isRoad: false,
    containingAreaHint: 'Colaba & Gateway Promenade',
    coordinates: { lat: 18.922, lng: 72.8347 },
    bounds: {
      northEast: { latitude: 18.928, longitude: 72.836 },
      southWest: { latitude: 18.915, longitude: 72.824 },
    },
  },
  {
    placeId: 'cat-landmark-eiffel-tower',
    mainText: 'Eiffel Tower',
    secondaryText: 'Paris, Île-de-France, France',
    areaType: 'locality',
    isRoad: false,
    containingAreaHint: 'Paris',
    coordinates: { lat: 48.8584, lng: 2.2945 },
    bounds: {
      northEast: { latitude: 48.865, longitude: 2.305 },
      southWest: { latitude: 48.85, longitude: 2.285 },
    },
  },
  {
    placeId: 'cat-landmark-tokyo-tower',
    mainText: 'Tokyo Tower',
    secondaryText: 'Tokyo, Japan',
    areaType: 'locality',
    isRoad: false,
    containingAreaHint: 'Tokyo',
    coordinates: { lat: 35.6586, lng: 139.7454 },
    bounds: {
      northEast: { latitude: 35.665, longitude: 139.755 },
      southWest: { latitude: 35.65, longitude: 139.735 },
    },
  },

  // ── Roads & Streets (Demonstrates Street-to-Area Elevation) ──────────
  {
    placeId: 'cat-road-carter-rd',
    mainText: 'Carter Road',
    secondaryText: 'Street in Bandra West, Mumbai, India',
    areaType: 'road',
    isRoad: true,
    containingAreaHint: 'Bandra West',
    coordinates: { lat: 19.068, lng: 72.821 },
    bounds: {
      northEast: { latitude: 19.072, longitude: 72.835 },
      southWest: { latitude: 19.055, longitude: 72.818 },
    },
  },
  {
    placeId: 'cat-road-baker-st',
    mainText: 'Baker Street',
    secondaryText: 'Street in Marylebone, London, UK',
    areaType: 'road',
    isRoad: true,
    containingAreaHint: 'Marylebone Enclave',
    coordinates: { lat: 51.52, lng: -0.158 },
    bounds: {
      northEast: { latitude: 51.525, longitude: -0.152 },
      southWest: { latitude: 51.515, longitude: -0.164 },
    },
  },
  {
    placeId: 'cat-road-5th-ave',
    mainText: '5th Avenue',
    secondaryText: 'Avenue in Manhattan Midtown, New York, NY, USA',
    areaType: 'road',
    isRoad: true,
    containingAreaHint: 'Manhattan Midtown',
    coordinates: { lat: 40.7589, lng: -73.9787 },
    bounds: {
      northEast: { latitude: 40.77, longitude: -73.97 },
      southWest: { latitude: 40.745, longitude: -74.0 },
    },
  },
]

const suggestionsCache = new Map<string, AreaSuggestion[]>()

export const geocodingService = {
  /**
   * Search and autocomplete areas matching user input.
   * Primary: Google Places AutocompleteService (worldwide coverage).
   * Secondary/Offline: Multi-metro geographic catalog with dynamic worldwide query resolution.
   */
  async getAreaSuggestions(query: string): Promise<AreaSuggestion[]> {
    const q = query.trim()
    if (!q || q.length < 2) return []

    const cacheKey = q.toLowerCase()
    if (suggestionsCache.has(cacheKey)) {
      return suggestionsCache.get(cacheKey)!
    }

    const cacheAndReturn = (results: AreaSuggestion[]) => {
      if (suggestionsCache.size > 200) {
        const firstKey = suggestionsCache.keys().next().value
        if (firstKey) suggestionsCache.delete(firstKey)
      }
      suggestionsCache.set(cacheKey, results)
      return results
    }

    // 1. Primary: Geoapify Address Autocomplete if configured
    if (isGeoapifyConfigured()) {
      try {
        const geoapifyResults = await geoapifyService.autocomplete(q)
        if (geoapifyResults && geoapifyResults.length > 0) {
          return cacheAndReturn(geoapifyResults)
        }
      } catch (err) {
        console.warn('[Awarely] Geoapify autocomplete query notice:', err)
      }
    }

    // 2. Secondary/Legacy: Google Maps Places Autocomplete if in browser or test harness
    const win = typeof window !== 'undefined' ? window : (globalThis as any).window
    if (win?.google?.maps?.places?.AutocompleteService) {
        try {
          const service = new win.google.maps.places.AutocompleteService()
          const predictions = await new Promise<any[]>((resolve) => {
            // Note: omitting `types: ['(regions)']` to allow discovery of localities,
            // neighborhoods, postal areas, roads, and landmarks for elevation
            service.getPlacePredictions(
              {
                input: q,
              },
              (results: any[], status: string) => {
                if (status === 'OK' && results) resolve(results)
                else resolve([])
              },
            )
          })

          if (predictions && predictions.length > 0) {
            const formatted: AreaSuggestion[] = predictions.map((p) => {
              const types: string[] = p.types || []
              const isRoad = isRoadLevelEntity(types)
              const isStation = types.some((t) => t.includes('station') || t.includes('transit'))
              const isMarket = types.some((t) => t.includes('market') || t.includes('shopping_mall'))
              const isChowk = types.some((t) => t.includes('intersection') || t.includes('roundabout'))

              let areaType: AreaSuggestion['areaType'] = 'locality'
              if (isRoad) {
                areaType = 'road'
              } else if (isStation) {
                areaType = 'station'
              } else if (isMarket) {
                areaType = 'market'
              } else if (isChowk) {
                areaType = 'chowk'
              } else if (types.includes('neighborhood') || types.includes('sublocality')) {
                areaType = 'neighborhood'
              } else if (types.includes('postal_code')) {
                areaType = 'district'
              }

              return {
                placeId: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                areaType,
                isRoad,
              }
            })
            return cacheAndReturn(formatted)
          }
        } catch (err) {
          console.warn('[Awarely] Google Places Autocomplete query error:', err)
        }
      }
    // 2. Query seed catalog and known areas
    const matches: AreaSuggestion[] = []
    const lowerQ = q.toLowerCase()

    for (const item of SEED_SEARCH_CATALOG) {
      if (
        item.mainText.toLowerCase().includes(lowerQ) ||
        item.secondaryText.toLowerCase().includes(lowerQ) ||
        item.containingAreaHint?.toLowerCase().includes(lowerQ)
      ) {
        matches.push(item)
      }
    }

    // Check seed areas
    for (const a of SEED_AREAS) {
      if (!matches.some((m) => m.mainText.toLowerCase() === a.name.toLowerCase())) {
        if (
          a.name.toLowerCase().includes(lowerQ) ||
          a.city.toLowerCase().includes(lowerQ) ||
          a.fullName.toLowerCase().includes(lowerQ)
        ) {
          matches.push({
            placeId: a.id,
            mainText: a.name,
            secondaryText: `${a.city}, ${a.country}`,
            areaType: 'neighborhood',
            isRoad: false,
            bounds: a.bounds,
            coordinates: {
              lat: (a.bounds.northEast.latitude + a.bounds.southWest.latitude) / 2,
              lng: (a.bounds.northEast.longitude + a.bounds.southWest.longitude) / 2,
            },
          })
        }
      }
    }

    // 3. Dynamic Global Geographic Fallback:
    // If no static catalog items match and Google Places is unavailable/offline,
    // synthesize a geographic candidate so discovery is NEVER restricted to a small list.
    if (matches.length === 0 && q.length >= 3) {
      const isRoadQuery = /\b(road|rd|street|st|avenue|ave|lane|ln|highway|marg|path|boulevard|blvd)\b/i.test(q)
      const isStationQuery = /\b(station|junction|terminal|metro|transit)\b/i.test(q)
      const isMarketQuery = /\b(market|bazaar|bazar|mall|plaza)\b/i.test(q)
      const isChowkQuery = /\b(chowk|circle|roundabout|square|intersection)\b/i.test(q)
      const isPostalQuery = /^\d{5,6}$|^[A-Z0-9]{2,4}\s?[A-Z0-9]{3}$/i.test(q.trim())

      let areaType: AreaSuggestion['areaType'] = 'locality'
      if (isRoadQuery) areaType = 'road'
      else if (isStationQuery) areaType = 'station'
      else if (isMarketQuery) areaType = 'market'
      else if (isChowkQuery) areaType = 'chowk'
      else if (isPostalQuery) areaType = 'district'

      matches.push({
        placeId: `dynamic-${encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))}`,
        mainText: q.charAt(0).toUpperCase() + q.slice(1),
        secondaryText: 'Global Discovery (Area resolution)',
        areaType,
        isRoad: isRoadQuery,
      })
    }

    return cacheAndReturn(matches)
  },

  /**
   * Resolves a chosen suggestion or query into a full Area entity.
   * Handles:
   * - Google Maps Geocoder resolution for worldwide places
   * - Road & landmark elevation to containing broader neighborhood/locality
   * - Canonical ID generation
   * - Firestore lookup
   * - Zero-fabrication unreported area synthesis
   */
  async resolveArea(suggestion: AreaSuggestion): Promise<{
    area: Area
    isNewArea: boolean
    elevationNotice?: string
  }> {
    let elevationNotice: string | undefined

    // ── Check Road Elevation Protocol (Catalog or Pre-hinted) ────────
    if (suggestion.isRoad) {
      const containingHint = suggestion.containingAreaHint || 'the surrounding neighborhood'
      elevationNotice = `Awarely provides area-level awareness. Your search for "${suggestion.mainText}" has been elevated to ${containingHint}.`

      if (suggestion.containingAreaHint) {
        const containingArea = SEED_AREAS.find(
          (a) =>
            a.name.toLowerCase().includes(suggestion.containingAreaHint!.toLowerCase()) ||
            suggestion.containingAreaHint!.toLowerCase().includes(a.name.toLowerCase()),
        )
        if (containingArea) {
          return {
            area: containingArea,
            isNewArea: false,
            elevationNotice,
          }
        }
      }
    }

    const win = typeof window !== 'undefined' ? window : (globalThis as any).window
    if (
      win?.google?.maps?.Geocoder &&
      suggestion.placeId &&
      !suggestion.placeId.startsWith('cat-') &&
      !suggestion.placeId.startsWith('dynamic-') &&
      !suggestion.placeId.startsWith('geo-') &&
      !suggestion.placeId.startsWith('rev-') &&
      !suggestion.placeId.startsWith('geoapify-')
    ) {
      try {
        const geocoder = new win.google.maps.Geocoder()
        const geocodeResult = await new Promise<any>((resolve) => {
          geocoder.geocode({ placeId: suggestion.placeId }, (results: any[], status: string) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0])
            } else {
              resolve(null)
            }
          })
        })

        if (geocodeResult) {
          const addressComponents = geocodeResult.address_components || []
          const rawTypes = geocodeResult.types || []
          const extracted = extractGeographicComponents(
            addressComponents,
            rawTypes,
            suggestion.mainText,
          )

          const lat = geocodeResult.geometry?.location?.lat() ?? 0
          const lng = geocodeResult.geometry?.location?.lng() ?? 0

          let bounds: AreaBounds
          if (geocodeResult.geometry?.viewport) {
            bounds = {
              northEast: {
                latitude: geocodeResult.geometry.viewport.getNorthEast().lat(),
                longitude: geocodeResult.geometry.viewport.getNorthEast().lng(),
              },
              southWest: {
                latitude: geocodeResult.geometry.viewport.getSouthWest().lat(),
                longitude: geocodeResult.geometry.viewport.getSouthWest().lng(),
              },
            }
          } else {
            bounds = {
              northEast: { latitude: lat + 0.008, longitude: lng + 0.008 },
              southWest: { latitude: lat - 0.008, longitude: lng - 0.008 },
            }
          }

          if (extracted.isRoadDerived) {
            const elevatedTarget =
              extracted.neighborhood ||
              extracted.sublocality ||
              extracted.locality ||
              extracted.city ||
              'the containing area'
            elevationNotice = `Awarely provides area-level awareness. Your search for "${suggestion.mainText}" has been elevated to ${elevatedTarget}.`
          }

          const canonicalId = generateCanonicalAreaId(extracted)

          // 1. Check known seed areas
          const matchedSeed = SEED_AREAS.find((a) => a.id === canonicalId)
          if (matchedSeed) {
            return { area: matchedSeed, isNewArea: false, elevationNotice }
          }

          // 2. Check Firestore
          try {
            const fromFirestore = await firestoreService.getArea(canonicalId)
            if (fromFirestore) {
              return { area: fromFirestore, isNewArea: false, elevationNotice }
            }
          } catch {
            // Unreported area synthesis
          }

          // 3. New Unreported Area (Zero Fabrication Mandate)
          const primaryName =
            extracted.neighborhood ||
            extracted.sublocality ||
            extracted.locality ||
            extracted.postalCode ||
            suggestion.mainText

          const newArea = createUnreportedArea(
            canonicalId,
            primaryName,
            extracted.city || 'Metro Region',
            extracted.country || 'Region',
            bounds,
            { lat, lng },
          )

          return {
            area: newArea,
            isNewArea: true,
            elevationNotice,
          }
        }
      } catch (err) {
        console.warn('[Awarely] Geocoder error during area resolution:', err)
      }
    }

    // ── Check if already in SEED_AREAS or Firestore ────────────────────
    const existingSeed = SEED_AREAS.find(
      (a) =>
        a.id === suggestion.placeId ||
        a.name.toLowerCase() === suggestion.mainText.toLowerCase(),
    )
    if (existingSeed) {
      return {
        area: existingSeed,
        isNewArea: false,
        elevationNotice,
      }
    }

    // Check Firestore by placeId or ID
    try {
      const fromFirestore = await firestoreService.getArea(suggestion.placeId)
      if (fromFirestore) {
        return {
          area: fromFirestore,
          isNewArea: false,
          elevationNotice,
        }
      }
    } catch {
      // Continue to canonical synthesis
    }

    // ── Generate Canonical Area ID ─────────────────────────────────────
    const parts = suggestion.secondaryText.split(',').map((s) => s.trim())
    const city = parts[0] && parts[0] !== 'Global Discovery (Area resolution)' ? parts[0] : 'Metro'
    const country = parts[parts.length - 1] || 'Region'
    let countryCode = 'XX'
    const lowerSec = suggestion.secondaryText.toLowerCase()
    if (lowerSec.includes('india')) countryCode = 'IN'
    else if (lowerSec.includes('uk') || lowerSec.includes('united kingdom')) countryCode = 'GB'
    else if (lowerSec.includes('japan')) countryCode = 'JP'
    else if (lowerSec.includes('france')) countryCode = 'FR'
    else if (lowerSec.includes('united states') || lowerSec.includes('usa')) countryCode = 'US'
    else if (lowerSec.includes('australia')) countryCode = 'AU'
    else if (lowerSec.includes('brazil')) countryCode = 'BR'
    else if (lowerSec.includes('south africa')) countryCode = 'ZA'

    const primaryName = suggestion.containingAreaHint || suggestion.mainText

    const components: GeographicComponents = {
      neighborhood: primaryName,
      city,
      country,
      countryCode,
      primaryAreaType: suggestion.isRoad ? 'neighborhood' : (suggestion.areaType as any),
      isRoadDerived: suggestion.isRoad,
      originalQuery: suggestion.mainText,
    }

    const canonicalId = generateCanonicalAreaId(components)

    // Check if canonical ID matches a known area
    const matchedCanonical = SEED_AREAS.find((a) => a.id === canonicalId)
    if (matchedCanonical) {
      return {
        area: matchedCanonical,
        isNewArea: false,
        elevationNotice,
      }
    }

    // ── New Unreported Area Creation (Zero Fabrication Rule) ───────────
    const defaultCenter = suggestion.coordinates || { lat: 26.85, lng: 80.99 }
    const defaultBounds: AreaBounds = suggestion.bounds || {
      northEast: {
        latitude: defaultCenter.lat + 0.008,
        longitude: defaultCenter.lng + 0.008,
      },
      southWest: {
        latitude: defaultCenter.lat - 0.008,
        longitude: defaultCenter.lng - 0.008,
      },
    }

    const newArea = createUnreportedArea(
      canonicalId,
      primaryName,
      city,
      country,
      defaultBounds,
      defaultCenter,
    )

    return {
      area: newArea,
      isNewArea: true,
      elevationNotice,
    }
  },

  /**
   * Reverse geocode coarse coordinates to a canonical Awarely area suggestion.
   * Uses Google Maps Geocoder if loaded, falling back to spatial proximity
   * across known areas and dynamic locality resolution.
   * Coordinate precision is always truncated (~111m) before processing.
   */
  async reverseGeocode(lat: number, lng: number): Promise<AreaSuggestion> {
    const coarseLat = Math.round(lat * 1000) / 1000
    const coarseLng = Math.round(lng * 1000) / 1000

    // 1. Primary: Geoapify Reverse Geocoding (Zero-Cost, Privacy-Truncated)
    if (isGeoapifyConfigured()) {
      try {
        const geoapifySuggestion = await geoapifyService.reverseGeocode(coarseLat, coarseLng)
        if (geoapifySuggestion) {
          return geoapifySuggestion
        }
      } catch (err) {
        console.warn('[Awarely] Geoapify reverse lookup notice:', err)
      }
    }

    // 2. Secondary/Legacy: If Google Maps JavaScript API Geocoder is available in window:
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder()
        const response = await new Promise<any[]>((resolve, reject) => {
          geocoder.geocode(
            { location: { lat: coarseLat, lng: coarseLng } },
            (results: any[], status: string) => {
              if (status === 'OK' && results && results.length > 0) {
                resolve(results)
              } else {
                reject(new Error(`Geocoder status: ${status}`))
              }
            }
          )
        })

        if (response && response.length > 0) {
          // Look for an area-level result, or extract components from the primary result
          let bestResult = response.find((res) => {
            const types: string[] = res.types || []
            return types.some((t: string) =>
              [
                'sublocality_level_1',
                'sublocality',
                'neighborhood',
                'locality',
                'administrative_area_level_2',
              ].includes(t)
            )
          })

          if (!bestResult) {
            bestResult = response[0]
          }

          const extracted = extractGeographicComponents(
            bestResult.address_components || [],
            bestResult.types || [],
          )

          const neighborhood =
            extracted.neighborhood ||
            extracted.sublocality ||
            extracted.locality
          const city = extracted.city || extracted.locality || 'Local Area'
          const state = extracted.state || ''
          const country = extracted.country || 'Global'

          const mainText = neighborhood || city
          const secondaryText = `${city}${state ? `, ${state}` : ''}, ${country}`

          let bounds: AreaBounds | undefined
          if (bestResult.geometry?.viewport) {
            bounds = {
              northEast: {
                latitude: bestResult.geometry.viewport.getNorthEast().lat(),
                longitude: bestResult.geometry.viewport.getNorthEast().lng(),
              },
              southWest: {
                latitude: bestResult.geometry.viewport.getSouthWest().lat(),
                longitude: bestResult.geometry.viewport.getSouthWest().lng(),
              },
            }
          }

          return {
            placeId: bestResult.place_id || `geo-${coarseLat}-${coarseLng}`,
            mainText,
            secondaryText,
            areaType:
              extracted.primaryAreaType === 'road_fallback' ||
              (extracted.primaryAreaType as string) === 'sublocality'
                ? 'neighborhood'
                : (extracted.primaryAreaType as any),
            isRoad: false,
            coordinates: { lat: coarseLat, lng: coarseLng },
            bounds,
            resolutionSource: 'Google Geocoder (Browser Reverse Geocode)',
            fallbackUsed: false,
          }
        }
      } catch (err) {
        console.warn('[Awarely] Google Geocoder reverse lookup error:', err)
      }
    }

    // 2. Spatial match against SEED_AREAS bounding boxes
    for (const a of SEED_AREAS) {
      if (
        coarseLat >= a.bounds.southWest.latitude &&
        coarseLat <= a.bounds.northEast.latitude &&
        coarseLng >= a.bounds.southWest.longitude &&
        coarseLng <= a.bounds.northEast.longitude
      ) {
        return {
          placeId: a.id,
          mainText: a.name,
          secondaryText: `${a.city}, ${a.country}`,
          areaType: 'neighborhood',
          isRoad: false,
          coordinates: { lat: coarseLat, lng: coarseLng },
          bounds: a.bounds,
          resolutionSource: 'Curated Seed Area (Geographic Bounds)',
          fallbackUsed: true,
        }
      }
    }

    // 3. Spatial match against SEED_SEARCH_CATALOG bounds
    for (const cat of SEED_SEARCH_CATALOG) {
      if (cat.bounds) {
        if (
          coarseLat >= cat.bounds.southWest.latitude &&
          coarseLat <= cat.bounds.northEast.latitude &&
          coarseLng >= cat.bounds.southWest.longitude &&
          coarseLng <= cat.bounds.northEast.longitude
        ) {
          return {
            ...cat,
            coordinates: { lat: coarseLat, lng: coarseLng },
            resolutionSource: 'Local Catalog Boundary Match',
            fallbackUsed: true,
          }
        }
      }
    }

    // 4. Proximity match against catalog items ONLY if within immediate neighborhood bounds (approx ~1km / 0.01 deg)
    let closestCat: AreaSuggestion | null = null
    let minDistance = Infinity
    for (const cat of SEED_SEARCH_CATALOG) {
      if (cat.coordinates && !cat.bounds) {
        const dist = Math.hypot(
          cat.coordinates.lat - coarseLat,
          cat.coordinates.lng - coarseLng
        )
        if (dist < minDistance) {
          minDistance = dist
          closestCat = cat
        }
      }
    }

    if (closestCat && minDistance < 0.01) {
      return {
        placeId: `rev-${closestCat.placeId}-${coarseLat}-${coarseLng}`,
        mainText: closestCat.mainText,
        secondaryText: closestCat.secondaryText,
        areaType: closestCat.areaType,
        isRoad: false,
        coordinates: { lat: coarseLat, lng: coarseLng },
        containingAreaHint: closestCat.containingAreaHint,
        resolutionSource: 'Local Catalog Boundary Match',
        fallbackUsed: true,
      }
    }

    // 5. Generic geographic resolution for any uncatalogued coordinate worldwide
    return {
      placeId: `rev-global-${coarseLat}-${coarseLng}`,
      mainText: `Local Area (${coarseLat.toFixed(2)}, ${coarseLng.toFixed(2)})`,
      secondaryText: 'Global Discovery, Worldwide',
      areaType: 'locality',
      isRoad: false,
      coordinates: { lat: coarseLat, lng: coarseLng },
      resolutionSource: 'Dynamic Geographic Locality Synthesis',
      fallbackUsed: true,
    }
  },
}

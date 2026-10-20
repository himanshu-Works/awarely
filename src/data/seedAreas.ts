import type { Area } from '@/types/area'
import { Timestamp } from 'firebase/firestore'

// Safe helper to construct mock Timestamp or real Timestamp
function createTimestamp(minutesAgo: number): Timestamp {
  const date = new Date(Date.now() - minutesAgo * 60 * 1000)
  return Timestamp.fromDate(date)
}

export const SEED_AREAS: Area[] = [
  {
    id: 'area-mumbai-colaba',
    name: 'Colaba & Gateway Promenade',
    city: 'Mumbai',
    country: 'India',
    fullName: 'Colaba, Mumbai, Maharashtra, India',
    bounds: {
      northEast: { latitude: 18.928, longitude: 72.836 },
      southWest: { latitude: 18.915, longitude: 72.824 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [72.824, 18.915],
          [72.836, 18.915],
          [72.836, 18.928],
          [72.824, 18.928],
          [72.824, 18.915],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(18),
    isActive: true,
    reportCount: 38,
    recentReportCount: 14,
    latestReportAt: createTimestamp(18),
    topObservations: [
      'Well-lit',
      'High foot traffic',
      'Police presence',
      'Businesses open',
    ],
    dayNightSplit: {
      day: 92,
      night: 84,
    },
    confidenceLevel: 'high',
    awarenessLevel: 'active',
    aiSummary:
      'Community members note high pedestrian density and well-lit promenades along the waterfront. Police assistance booths are visible near the monument. Quicker pace observed in market alleys after 11 PM.',
    aiSummaryGeneratedAt: createTimestamp(18),
  },
  {
    id: 'area-mumbai-bandra-west',
    name: 'Bandra West (Carter Rd & Pali Hill)',
    city: 'Mumbai',
    country: 'India',
    fullName: 'Bandra West, Mumbai, Maharashtra, India',
    bounds: {
      northEast: { latitude: 19.072, longitude: 72.835 },
      southWest: { latitude: 19.055, longitude: 72.818 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [72.818, 19.055],
          [72.835, 19.055],
          [72.835, 19.072],
          [72.818, 19.072],
          [72.818, 19.055],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(55),
    isActive: true,
    reportCount: 29,
    recentReportCount: 9,
    latestReportAt: createTimestamp(55),
    topObservations: [
      'Well-lit',
      'Crowded',
      'High foot traffic',
      'Felt comfortable',
    ],
    dayNightSplit: {
      day: 95,
      night: 88,
    },
    confidenceLevel: 'high',
    awarenessLevel: 'active',
    aiSummary:
      'Vibrant seaside promenade with active community walkers and opened cafes until late. Well illuminated along main thoroughfares; minor traffic congestion reported near Hill Road intersection.',
    aiSummaryGeneratedAt: createTimestamp(55),
  },
  {
    id: 'area-delhi-cp',
    name: 'Connaught Place (Inner & Outer Circle)',
    city: 'New Delhi',
    country: 'India',
    fullName: 'Connaught Place, New Delhi, Delhi, India',
    bounds: {
      northEast: { latitude: 28.636, longitude: 77.225 },
      southWest: { latitude: 28.625, longitude: 77.211 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [77.211, 28.625],
          [77.225, 28.625],
          [77.225, 28.636],
          [77.211, 28.636],
          [77.211, 28.625],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(120),
    isActive: true,
    reportCount: 22,
    recentReportCount: 6,
    latestReportAt: createTimestamp(120),
    topObservations: [
      'High foot traffic',
      'Police presence',
      'Crowded',
      'Businesses open',
    ],
    dayNightSplit: {
      day: 90,
      night: 76,
    },
    confidenceLevel: 'moderate',
    awarenessLevel: 'active',
    aiSummary:
      'Major commercial hub with continuous security presence and Metro connectivity. Corridor walkways are active. Travelers suggest remaining aware of personal belongings during rush hours.',
    aiSummaryGeneratedAt: createTimestamp(120),
  },
  {
    id: 'area-delhi-hauz-khas',
    name: 'Hauz Khas Village & Environs',
    city: 'New Delhi',
    country: 'India',
    fullName: 'Hauz Khas Village, New Delhi, Delhi, India',
    bounds: {
      northEast: { latitude: 28.558, longitude: 77.202 },
      southWest: { latitude: 28.547, longitude: 77.191 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [77.191, 28.547],
          [77.202, 28.547],
          [77.202, 28.558],
          [77.191, 28.558],
          [77.191, 28.547],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(310),
    isActive: true,
    reportCount: 16,
    recentReportCount: 4,
    latestReportAt: createTimestamp(310),
    topObservations: [
      'Poor lighting',
      'Isolated',
      'Businesses open',
      'Felt uncomfortable',
    ],
    dayNightSplit: {
      day: 88,
      night: 68,
    },
    confidenceLevel: 'moderate',
    awarenessLevel: 'mixed',
    aiSummary:
      'Popular arts and dining precinct bustling during afternoons. Evening contributors indicate dim lighting around the reservoir trail and narrow entry lanes. Recommend staying on illuminated restaurant streets at night.',
    aiSummaryGeneratedAt: createTimestamp(310),
  },
  {
    id: 'area-delhi-rail-corridor',
    name: 'Old Delhi Transit & Railway Perimeter',
    city: 'New Delhi',
    country: 'India',
    fullName: 'Railway Colony Perimeter, Old Delhi, Delhi, India',
    bounds: {
      northEast: { latitude: 28.665, longitude: 77.228 },
      southWest: { latitude: 28.653, longitude: 77.215 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [77.215, 28.653],
          [77.228, 28.653],
          [77.228, 28.665],
          [77.215, 28.665],
          [77.215, 28.653],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(840),
    isActive: true,
    reportCount: 19,
    recentReportCount: 5,
    latestReportAt: createTimestamp(840),
    topObservations: [
      'Poor lighting',
      'Isolated',
      'Low foot traffic',
      'Felt uncomfortable',
    ],
    dayNightSplit: {
      day: 72,
      night: 48,
    },
    confidenceLevel: 'moderate',
    awarenessLevel: 'quiet',
    aiSummary:
      'Pedestrians report intermittent lighting along secondary underpasses and low foot traffic after 10 PM. Commuters recommend using the main arterial boulevard rather than perimeter service lanes.',
    aiSummaryGeneratedAt: createTimestamp(840),
  },
  {
    id: 'area-london-soho',
    name: 'Soho & Covent Garden',
    city: 'London',
    country: 'United Kingdom',
    fullName: 'Soho, West End, London, UK',
    bounds: {
      northEast: { latitude: 51.516, longitude: -0.126 },
      southWest: { latitude: 51.511, longitude: -0.138 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-0.138, 51.511],
          [-0.126, 51.511],
          [-0.126, 51.516],
          [-0.138, 51.516],
          [-0.138, 51.511],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(45),
    isActive: true,
    reportCount: 44,
    recentReportCount: 17,
    latestReportAt: createTimestamp(45),
    topObservations: [
      'Well-lit',
      'Crowded',
      'High foot traffic',
      'Businesses open',
    ],
    dayNightSplit: {
      day: 94,
      night: 86,
    },
    confidenceLevel: 'high',
    awarenessLevel: 'active',
    aiSummary:
      'High pedestrian footfall with active theatre district commerce and frequent transit options. Well illuminated throughout the evening hours.',
    aiSummaryGeneratedAt: createTimestamp(45),
  },
  {
    id: 'area-london-canal-path',
    name: 'Regent Canal Towpath (East Stretch)',
    city: 'London',
    country: 'United Kingdom',
    fullName: 'Regents Canal Path, Hackney, London, UK',
    bounds: {
      northEast: { latitude: 51.538, longitude: -0.052 },
      southWest: { latitude: 51.531, longitude: -0.068 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-0.068, 51.531],
          [-0.052, 51.531],
          [-0.052, 51.538],
          [-0.068, 51.538],
          [-0.068, 51.531],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(2880), // 2 days ago
    isActive: true,
    reportCount: 8,
    recentReportCount: 2,
    latestReportAt: createTimestamp(2880),
    topObservations: [
      'Poor lighting',
      'Isolated',
      'Low foot traffic',
    ],
    dayNightSplit: {
      day: 85,
      night: 52,
    },
    confidenceLevel: 'low',
    awarenessLevel: 'mixed',
    aiSummary:
      'Pleasant pedestrian and cycling route during bright daylight hours. Night observations note absence of overhead street lighting between bridges. Travelers suggest road-level alternatives after dark.',
    aiSummaryGeneratedAt: createTimestamp(2880),
  },
  {
    id: 'area-mumbai-industrial',
    name: 'Navi Mumbai Sector 18 Enclave',
    city: 'Mumbai',
    country: 'India',
    fullName: 'Sector 18, Turbhe Industrial Corridor, Navi Mumbai, India',
    bounds: {
      northEast: { latitude: 19.085, longitude: 73.018 },
      southWest: { latitude: 19.072, longitude: 73.002 },
    },
    polygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [73.002, 19.072],
          [73.018, 19.072],
          [73.018, 19.085],
          [73.002, 19.085],
          [73.002, 19.072],
        ],
      ],
    }),
    createdAt: createTimestamp(43200),
    updatedAt: createTimestamp(10080), // 7 days ago
    isActive: true,
    reportCount: 0,
    recentReportCount: 0,
    latestReportAt: null,
    topObservations: [],
    dayNightSplit: {
      day: 0,
      night: 0,
    },
    confidenceLevel: 'low',
    awarenessLevel: 'unknown',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  },
]

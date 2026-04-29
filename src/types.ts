export interface Activity {
  activity: string;
  location: string;
  cost: number;
  description: string;
  rating?: number;
  reviewCount?: number;
}

export interface DayItinerary {
  day: number;
  morning: Activity;
  afternoon: Activity;
  evening: Activity;
  totalDayCost: number;
  preview360Url?: string;
  logic: string;
}

export interface MapPoint {
  name: string;
  type: 'attraction' | 'restaurant' | 'hotel';
  description: string;
  streetViewUrl?: string;
  rating?: number;
  reviewCount?: number;
}

export interface TravelPlan {
  tourName: string;
  story: string;
  itinerary: DayItinerary[];
  mapPoints: MapPoint[];
  totalEstimatedCost: number;
  budgetAnalysis: string;
  personalizationLogic: string;
  aiInsight: string;
}

export interface UserPreferences {
  budget: number;
  duration: number;
  startLocation: string;
  interests: string[];
  mood: string;
  wishlist: string[];
}
